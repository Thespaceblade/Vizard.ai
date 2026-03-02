import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { ok: false, error: "Expected multipart/form-data" },
        { status: 400 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "CSV file is required" },
        { status: 400 },
      );
    }

    const name = file.name;
    const bytes = await file.arrayBuffer();
    const size = bytes.byteLength;

    const csvBase64 = Buffer.from(bytes).toString("base64");

    return NextResponse.json({
      ok: true,
      file: {
        name,
        size,
      },
      csvBase64,
    });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

