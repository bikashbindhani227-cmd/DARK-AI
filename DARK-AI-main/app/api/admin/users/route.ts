import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  const backendUrl = process.env.RENDER_BACKEND_URL?.replace(/\/$/, "");
  if (!backendUrl) return NextResponse.json({ error: "RENDER_BACKEND_URL is not configured." }, { status: 503 });
  const url = new URL(`${backendUrl}/api/admin/users`); const q = req.nextUrl.searchParams.get("q"); if (q) url.searchParams.set("q", q);
  const response = await fetch(url, { headers: { authorization: req.headers.get("authorization") || "" }, cache: "no-store" });
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: response.headers });
}
