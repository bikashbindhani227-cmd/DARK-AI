import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const backendUrl = process.env.RENDER_BACKEND_URL?.replace(/\/$/, "");
  if (!backendUrl) {
    return NextResponse.json({ error: "RENDER_BACKEND_URL is not configured." }, { status: 503 });
  }
  const body = await req.arrayBuffer();
  const response = await fetch(`${backendUrl}/api/search`, {
    method: "POST",
    headers: { "content-type": req.headers.get("content-type") || "application/json" },
    body,
    cache: "no-store",
  });
  return new NextResponse(response.body, { status: response.status, headers: response.headers });
}
