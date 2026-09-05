import { NextRequest, NextResponse } from "next/server";
export async function GET(req: NextRequest) {
  const backendUrl = process.env.RENDER_BACKEND_URL?.replace(/\/$/, "");
  if (!backendUrl) return NextResponse.json({ error: "RENDER_BACKEND_URL is not configured." }, { status: 503 });
  const response = await fetch(`${backendUrl}/api/admin/stats`, { headers: { authorization: req.headers.get("authorization") || "" }, cache: "no-store" });
  return new NextResponse(response.body, { status: response.status, headers: response.headers });
}
