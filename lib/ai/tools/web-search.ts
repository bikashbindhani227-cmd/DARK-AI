import { tool } from "ai";
import type { ToolContext } from "@/types";
import { stringifyRedactedError } from "@/lib/utils/error-redaction";
import {
  PERPLEXITY_QUERY_MAX_LENGTH,
  createWebSearchToolSchema,
  webSearchTool,
  type WebSearchToolInput,
} from "./schemas";
import { reportToolFailure } from "./tool-failure";

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";
const WEB_SEARCH_MAX_RESULTS = 5;
const WEB_SEARCH_MAX_ATTEMPTS = 2;
const WEB_SEARCH_RETRY_BASE_DELAY_MS = 350;
const EMPTY_QUERY_TOOL_ERROR =
  "Error performing web search: Provide at least one non-empty query.";
const QUERY_TOO_LONG_TOOL_ERROR = `Error performing web search: Each query must be ${PERPLEXITY_QUERY_MAX_LENGTH} characters or fewer.`;

type TavilyResult = {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
  published_date?: string;
};

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Operation aborted", "AbortError"));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Operation aborted", "AbortError"));
    }, { once: true });
  });

const normalizeQueries = (rawQueries: string[]) => {
  const queries = rawQueries.map((q) => q.trim()).filter(Boolean).slice(0, 3);
  if (!queries.length) return { queries, error: EMPTY_QUERY_TOOL_ERROR };
  if (queries.some((q) => q.length > PERPLEXITY_QUERY_MAX_LENGTH)) {
    return { queries, error: QUERY_TOO_LONG_TOOL_ERROR };
  }
  return { queries };
};

const fetchTavily = async (query: string, signal?: AbortSignal) => {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) throw new Error("Tavily API key is not configured.");

  let lastError: unknown;
  for (let attempt = 0; attempt < WEB_SEARCH_MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(TAVILY_SEARCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query,
          search_depth: "basic",
          max_results: WEB_SEARCH_MAX_RESULTS,
          include_answer: false,
          include_raw_content: false,
        }),
        signal,
      });
      if (response.ok) return await response.json() as { results?: TavilyResult[] };
      const text = await response.text();
      lastError = new Error(`Tavily HTTP ${response.status}: ${text.slice(0, 300)}`);
      if (![408, 429, 500, 502, 503, 504].includes(response.status)) break;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      lastError = error;
    }
    if (attempt + 1 < WEB_SEARCH_MAX_ATTEMPTS) await sleep(WEB_SEARCH_RETRY_BASE_DELAY_MS * 2 ** attempt, signal);
  }
  throw lastError instanceof Error ? lastError : new Error("Tavily search failed.");
};

export const createWebSearch = (context: ToolContext) => {
  return tool({
    ...webSearchTool,
    inputSchema: createWebSearchToolSchema({
      modelName: context.getCurrentModelName?.() ?? context.modelName,
    }).inputSchema,
    execute: async ({ queries: rawQueries }: WebSearchToolInput, { abortSignal }) => {
      try {
        const { queries, error } = normalizeQueries(rawQueries);
        if (error) return error;
        if (!process.env.TAVILY_API_KEY) {
          return "Error performing web search: TAVILY_API_KEY is not configured on the server.";
        }

        const allResults: Array<{ title: string; url: string; content: string; date: string | null; lastUpdated: string | null }> = [];
        for (const query of queries) {
          const response = await fetchTavily(query, abortSignal);
          for (const item of response.results ?? []) {
            if (!item.url) continue;
            allResults.push({
              title: item.title || item.url,
              url: item.url,
              content: item.content || "",
              date: item.published_date || null,
              lastUpdated: null,
            });
          }
        }
        context.onToolCost?.(0);
        return allResults.slice(0, WEB_SEARCH_MAX_RESULTS * Math.max(1, queries.length));
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return "Error: Operation aborted";
        const message = stringifyRedactedError(error);
        reportToolFailure(context.onToolFailure, {
          event: "web_search_tool_failed",
          tool_name: "web_search",
          provider: "tavily",
          error_name: error instanceof Error ? error.name : "UnknownError",
          error_message: message,
        });
        console.error("Tavily web search error:", message);
        return `Error performing web search: ${message}`;
      }
    },
  });
};
