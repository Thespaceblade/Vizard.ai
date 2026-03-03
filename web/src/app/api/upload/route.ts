import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const PYTHON_SERVICE_URL =
  process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

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
        { ok: false, error: "CSV or Excel file is required" },
        { status: 400 },
      );
    }

    const name = file.name;
    const bytes = await file.arrayBuffer();
    const size = bytes.byteLength;
    const isXlsx = name.toLowerCase().endsWith(".xlsx");

    let csvBase64: string;
    if (isXlsx) {
      const fileBase64 = Buffer.from(bytes).toString("base64");
      const convertRes = await fetch(`${PYTHON_SERVICE_URL}/convert-to-csv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_base64: fileBase64, format: "xlsx" }),
      });
      if (!convertRes.ok) {
        const err = await convertRes.text();
        return NextResponse.json(
          { ok: false, error: `Excel conversion failed: ${err}` },
          { status: 502 },
        );
      }
      const data = (await convertRes.json()) as { csv_base64: string };
      csvBase64 = data.csv_base64;
    } else {
      csvBase64 = Buffer.from(bytes).toString("base64");
    }

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

