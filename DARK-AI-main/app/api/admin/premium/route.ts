import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  const backendUrl = process.env.RENDER_BACKEND_URL?.replace(/\/$/, "");
  if (!backendUrl) return NextResponse.json({ error: "RENDER_BACKEND_URL is not configured." }, { status: 503 });
  const response = await fetch(`${backendUrl}/api/admin/premium`, { method: "POST", headers: { authorization: req.headers.get("authorization") || "", "content-type": "application/json" }, body: await req.arrayBuffer(), cache: "no-store" });
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: response.headers });
}
