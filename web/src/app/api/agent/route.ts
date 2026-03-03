import { NextRequest, NextResponse } from "next/server";
import { runAgent, type AgentResult } from "@/lib/agent";

export const runtime = "nodejs";

function parseSpec(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object" && raw !== null) return raw as Record<string, unknown>;
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let csvBase64: string | null = null;
    let prompt = "";
    let spec: Record<string, unknown> | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      const promptRaw = formData.get("prompt");
      const csvRaw = formData.get("csvBase64");
      const specRaw = formData.get("spec");

      if (csvRaw && typeof csvRaw === "string") {
        csvBase64 = csvRaw;
      } else if (file && file instanceof File) {
        const bytes = await file.arrayBuffer();
        csvBase64 = Buffer.from(bytes).toString("base64");
      }

      prompt = typeof promptRaw === "string" ? promptRaw : "";
      spec = parseSpec(specRaw);
    } else {
      const json = (await req.json()) as {
        csvBase64?: string;
        prompt?: string;
        spec?: unknown;
      };
      csvBase64 = json.csvBase64 ?? null;
      prompt = json.prompt ?? "";
      spec = parseSpec(json.spec);
    }

    if (!csvBase64) {
      return NextResponse.json(
        { ok: false, error: "Missing CSV data" },
        { status: 400 },
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (obj: object) => {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        };
        try {
          const result = await runAgent({
            csvBase64,
            prompt,
            spec: spec ?? undefined,
            onPhase: (phase) => enqueue({ type: "phase", phase }),
          });
          enqueue({ type: "result", result: result as AgentResult });
        } catch (err) {
          console.error(err);
          const message =
            err instanceof Error ? err.message : "Unexpected server error";
          enqueue({ type: "error", error: message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
