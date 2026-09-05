import { createChatHandler } from "@/lib/api/chat-handler";
import { NextRequest, NextResponse } from "next/server";
import { getUserID } from "@/lib/auth/get-user-id";

export const maxDuration = 420;

const legacyChatHandler = createChatHandler();

/**
 * Production chat transport: Vercel stays a thin frontend/API gateway while
 * Render owns provider secrets and AI execution. Local development can still
 * use the original handler when RENDER_BACKEND_URL is not configured.
 */
export async function POST(req: NextRequest) {
  const backendUrl = process.env.RENDER_BACKEND_URL?.replace(/\/$/, "");
  if (!backendUrl) return legacyChatHandler(req);

  const body = await req.arrayBuffer();
  const headers = new Headers(req.headers);
  headers.delete("host");
  try {
    const userId = await getUserID(req);
    headers.set("x-dark-ai-user", userId);
  } catch {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const response = await fetch(`${backendUrl}/api/chat`, {
    method: "POST",
    headers,
    body,
    cache: "no-store",
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
