import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/lib/agent";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let csvBase64: string | null = null;
    let prompt = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      const promptRaw = formData.get("prompt");
      const csvRaw = formData.get("csvBase64");

      if (csvRaw && typeof csvRaw === "string") {
        csvBase64 = csvRaw;
      } else if (file && file instanceof File) {
        const bytes = await file.arrayBuffer();
        csvBase64 = Buffer.from(bytes).toString("base64");
      }

      prompt = typeof promptRaw === "string" ? promptRaw : "";
    } else {
      const json = (await req.json()) as {
        csvBase64?: string;
        prompt?: string;
      };
      csvBase64 = json.csvBase64 ?? null;
      prompt = json.prompt ?? "";
    }

    if (!csvBase64) {
      return NextResponse.json(
        { ok: false, error: "Missing CSV data" },
        { status: 400 },
      );
    }

    const result = await runAgent({ csvBase64, prompt });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
