import { NextRequest, NextResponse } from "next/server";
import { authkit } from "@workos-inc/authkit-nextjs";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  const backendUrl = process.env.RENDER_BACKEND_URL?.replace(/\/$/, "");
  if (!backendUrl) return NextResponse.json({ error: "RENDER_BACKEND_URL is not configured." }, { status: 503 });
  const headers = new Headers(req.headers); headers.delete("host");
  try {
    const { session } = await authkit(req);
    if (!session?.user?.id) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    headers.set("x-dark-ai-user", session.user.id);
  } catch {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const response = await fetch(`${backendUrl}/api/user/sync`, { method: "POST", headers, body: await req.arrayBuffer(), cache: "no-store" });
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: response.headers });
}
