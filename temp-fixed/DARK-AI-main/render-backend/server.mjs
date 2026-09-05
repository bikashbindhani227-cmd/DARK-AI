import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, tool } from "ai";
import { z } from "zod";

const app = express();
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || !process.env.FRONTEND_URL || process.env.FRONTEND_URL === "*") return callback(null, true);
    const allowed = process.env.FRONTEND_URL.split(",").map((v) => v.trim()).filter(Boolean);
    return callback(null, allowed.includes(origin));
  },
  credentials: false,
}));
app.use(express.json({ limit: "8mb" }));

const port = Number(process.env.PORT || 8787);
const frontendUrl = process.env.FRONTEND_URL || "*";
const telegramPremiumContact = process.env.PREMIUM_TELEGRAM || "@MrNewton_2";

function cleanFirebaseKey(value) {
  return String(value || "").replace(/[.#$\[\]/]/g, "_").trim();
}

async function getUserRecord(uid) {
  if (!db || !uid) return null;
  const snapshot = await db.ref(`users/${cleanFirebaseKey(uid)}`).once("value");
  return snapshot.val() || null;
}

function isPremiumRecord(user) {
  if (!user?.premium) return false;
  if (user.premiumUntil == null) return true;
  return Number(user.premiumUntil) > Date.now();
}

let db = null;
try {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    const existing = getApps();
    if (!existing.length) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL || undefined,
      });
    }
    db = getDatabase();
  }
} catch (error) {
  console.error("Firebase initialization failed:", error?.message || error);
}

const openrouterProvider = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  headers: {
    ...(process.env.OPENROUTER_SITE_URL ? { "HTTP-Referer": process.env.OPENROUTER_SITE_URL } : {}),
    ...(process.env.OPENROUTER_APP_NAME ? { "X-Title": process.env.OPENROUTER_APP_NAME } : {}),
  },
});

const hfProvider = createOpenAI({
  apiKey: process.env.HF_TOKEN,
  baseURL: "https://router.huggingface.co/v1",
});

function getAIConfig() {
  const requested = String(process.env.AI_PROVIDER || "openrouter").toLowerCase();
  const useHf = requested === "hf" || (requested !== "openrouter" && !process.env.OPENROUTER_API_KEY && Boolean(process.env.HF_TOKEN));
  if (requested === "hf" && !process.env.HF_TOKEN) throw new Error("AI_PROVIDER=hf but HF_TOKEN is not configured on Render.");
  if (!useHf && !process.env.OPENROUTER_API_KEY) {
    if (process.env.HF_TOKEN) return { provider: hfProvider, name: "huggingface", model: process.env.HF_MODEL || "openai/gpt-oss-120b" };
    throw new Error("No AI provider key is configured. Add OPENROUTER_API_KEY or HF_TOKEN on Render.");
  }
  return {
    provider: useHf ? hfProvider : openrouterProvider,
    name: useHf ? "huggingface" : "openrouter",
    model: useHf ? (process.env.HF_MODEL || "openai/gpt-oss-120b") : (process.env.OPENROUTER_MODEL || "openrouter/free"),
  };
}

const asText = (content) => {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((part) => typeof part === "string" ? part : part?.text || "").join(" ").trim();
};

const tavilySearch = tool({
  description: "Search the public web for current information. Return concise source-backed results.",
  inputSchema: z.object({
    query: z.string().min(1).max(400),
  }),
  execute: async ({ query }) => {
    const key = process.env.TAVILY_API_KEY?.trim();
    if (!key) return { error: "Tavily API key is not configured." };
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ query, search_depth: "basic", max_results: 5, include_answer: false }),
    });
    if (!response.ok) return { error: `Tavily returned HTTP ${response.status}` };
    const data = await response.json();
    return (data.results || []).map((r) => ({ title: r.title, url: r.url, content: r.content, published_date: r.published_date || null }));
  },
});

async function saveChat(req, messages, assistantModel) {
  if (!db) return;
  const chatId = req.body?.chatId;
  if (!chatId) return;
  const userId = cleanFirebaseKey(req.headers["x-dark-ai-user"] || "anonymous");
  const ref = db.ref(`users/${userId}/chats/${cleanFirebaseKey(chatId)}`);
  await ref.update({ updatedAt: Date.now(), model: assistantModel || null, messages });
}

function signAdminToken() {
  const payload = `${Date.now() + 1000 * 60 * 60 * 12}`;
  const signature = crypto.createHmac("sha256", process.env.ADMIN_TOKEN_SECRET || "dev-secret").update(payload).digest("hex");
  return `${payload}.${signature}`;
}

function verifyAdminToken(token) {
  if (!token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || Number(expires) < Date.now()) return false;
  const expected = crypto.createHmac("sha256", process.env.ADMIN_TOKEN_SECRET || "dev-secret").update(expires).digest("hex");
  if (signature.length !== expected.length) return false;
  try { return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)); }
  catch { return false; }
}

function requireAdmin(req, res, next) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!verifyAdminToken(token)) return res.status(401).json({ error: "Unauthorized" });
  next();
}

app.get("/health", (_req, res) => res.json({ ok: true, service: "dark-ai-backend" }));

app.post("/api/search", async (req, res) => {
  try {
    const query = String(req.body?.query || "").trim();
    if (!query) return res.status(400).json({ error: "query is required" });
    const key = process.env.TAVILY_API_KEY?.trim();
    if (!key) return res.status(503).json({ error: "TAVILY_API_KEY is not configured" });
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ query, search_depth: "basic", max_results: 5, include_answer: false }),
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Search failed" });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    let aiConfig;
    try { aiConfig = getAIConfig(); }
    catch (providerError) { return res.status(503).json({ error: providerError?.message || "No AI provider is configured." }); }
    const incoming = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const modelMessages = await convertToModelMessages(incoming);
    const model = aiConfig.model;

    const result = streamText({
      model: aiConfig.provider(model),
      system: `You are DARK AI, a helpful general-purpose AI assistant. Use the web_search tool when the user asks for current, online, source-backed, or website information. Cite URLs from tool results in your answer. Never claim you browsed when you did not. For cybersecurity topics, stay within authorized, defensive, educational, and safe-use boundaries.`,
      messages: modelMessages,
      tools: { web_search: tavilySearch },
      maxOutputTokens: 2048,
    });

    result.text.then(async (text) => {
      try {
        await saveChat(req, [...incoming, { role: "assistant", content: [{ type: "text", text }] }], model);
      } catch (error) { console.error("Firebase chat save failed:", error?.message || error); }
    }).catch(() => {});

    return result.toUIMessageStreamResponse({ headers: { "x-dark-ai-model": model, "x-dark-ai-provider": aiConfig.name } });
  } catch (error) {
    console.error("/api/chat failed:", error?.stack || error);
    return res.status(500).json({ error: error?.message || "Chat failed" });
  }
});

app.post("/api/user/sync", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Firebase is not configured on the backend." });
  const uid = cleanFirebaseKey(req.headers["x-dark-ai-user"] || req.body?.uid);
  const email = String(req.body?.email || "").trim().slice(0, 320);
  const displayName = String(req.body?.displayName || "").trim().slice(0, 200);
  if (!uid) return res.status(400).json({ error: "uid is required" });
  const ref = db.ref(`users/${uid}`);
  const existing = (await ref.once("value")).val() || {};
  await ref.update({
    uid,
    ...(email ? { email } : {}),
    ...(displayName ? { displayName } : {}),
    updatedAt: Date.now(),
    lastSeenAt: Date.now(),
    accountType: isPremiumRecord(existing) ? "premium" : "free",
  });
  const latest = (await ref.once("value")).val() || {};
  return res.json({ premium: isPremiumRecord(latest), premiumUntil: latest.premiumUntil ?? null, telegram: telegramPremiumContact });
});

app.get("/api/premium/status", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Firebase is not configured on the backend." });
  const uid = cleanFirebaseKey(req.headers["x-dark-ai-user"]);
  if (!uid) return res.status(400).json({ error: "x-dark-ai-user header is required" });
  const user = await getUserRecord(uid);
  return res.json({
    premium: isPremiumRecord(user),
    premiumUntil: user?.premiumUntil ?? null,
    accountType: isPremiumRecord(user) ? "premium" : "free",
    telegram: telegramPremiumContact,
  });
});

app.get("/api/admin/users", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Firebase is not configured on the backend." });
  const q = String(req.query.q || "").trim().toLowerCase().slice(0, 200);
  const snapshot = await db.ref("users").once("value");
  const value = snapshot.val() || {};
  const users = Object.entries(value).map(([uid, user]) => ({
    uid,
    email: user?.email || "",
    displayName: user?.displayName || "",
    premium: isPremiumRecord(user),
    premiumUntil: user?.premiumUntil ?? null,
    accountType: isPremiumRecord(user) ? "premium" : "free",
    lastSeenAt: user?.lastSeenAt ?? null,
  })).filter((user) => !q || user.uid.toLowerCase().includes(q) || user.email.toLowerCase().includes(q) || user.displayName.toLowerCase().includes(q)).slice(0, 100);
  return res.json({ users });
});

app.post("/api/admin/premium", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Firebase is not configured on the backend." });
  const uid = cleanFirebaseKey(req.body?.uid);
  const action = String(req.body?.action || "").toLowerCase();
  const days = Number(req.body?.days || 30);
  if (!uid) return res.status(400).json({ error: "uid is required" });
  const ref = db.ref(`users/${uid}`);
  const current = (await ref.once("value")).val() || {};
  if (!["grant", "extend", "remove"].includes(action)) return res.status(400).json({ error: "action must be grant, extend, or remove" });
  if (action !== "remove" && (!Number.isFinite(days) || days <= 0 || days > 3650)) return res.status(400).json({ error: "days must be between 1 and 3650" });

  let premiumUntil = null;
  if (action === "grant") premiumUntil = Math.round(Date.now() + days * 86400000);
  if (action === "extend") {
    const base = isPremiumRecord(current) && Number(current.premiumUntil) > Date.now() ? Number(current.premiumUntil) : Date.now();
    premiumUntil = Math.round(base + days * 86400000);
  }

  const premium = action !== "remove";
  await ref.update({
    premium,
    accountType: premium ? "premium" : "free",
    premiumUntil,
    premiumGrantedAt: premium ? Date.now() : null,
    premiumActionAt: Date.now(),
    premiumActionBy: "admin",
  });
  const latest = (await ref.once("value")).val() || {};
  return res.json({ ok: true, uid, premium: isPremiumRecord(latest), premiumUntil: latest.premiumUntil ?? null });
});

app.post("/api/admin/login", (req, res) => {
  const password = String(req.body?.password || "");
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: "Invalid admin password" });
  return res.json({ token: signAdminToken() });
});

async function countPremiumUsers() {
  if (!db) return 0;
  const snapshot = await db.ref("users").once("value");
  const value = snapshot.val() || {};
  return Object.values(value).filter((user) => isPremiumRecord(user)).length;
}

app.get("/api/admin/stats", requireAdmin, async (_req, res) => {
  let users = 0;
  let chats = 0;
  if (db) {
    try {
      const snapshot = await db.ref("users").once("value");
      const value = snapshot.val() || {};
      users = Object.keys(value).length;
      for (const user of Object.values(value)) chats += Object.keys(user?.chats || {}).length;
    } catch (error) { console.error("Firebase stats failed:", error?.message || error); }
  }
  let aiConfig = null;
  try { aiConfig = getAIConfig(); } catch {}
  res.json({ users, premiumUsers: db ? await countPremiumUsers() : 0, chats, searchProvider: "tavily", aiProvider: aiConfig?.name || "not-configured", model: aiConfig?.model || null, firebaseEnabled: Boolean(db), frontendUrl, telegramPremiumContact });
});

app.listen(port, "0.0.0.0", () => console.log(`DARK AI backend listening on 0.0.0.0:${port}`));
