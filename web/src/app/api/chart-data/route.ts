import { NextRequest, NextResponse } from "next/server";
import type { VizSpec } from "@/lib/tools";

const PYTHON_SERVICE_URL =
  process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

export const runtime = "nodejs";

export interface ChartDataResponse {
  spec: { viz_type: string; x: string | null; y: string | null };
  data: Record<string, unknown>[];
  use_plotly: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      csvBase64?: string;
      spec?: Partial<VizSpec>;
    };
    const csvBase64 = body.csvBase64 ?? null;
    const spec = body.spec ?? null;

    if (!csvBase64 || !spec?.viz_type) {
      return NextResponse.json(
        { error: "Missing csvBase64 or spec.viz_type" },
        { status: 400 },
      );
    }

    const res = await fetch(`${PYTHON_SERVICE_URL}/chart-data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        csv_base64: csvBase64,
        spec: {
          viz_type: spec.viz_type,
          x: spec.x ?? null,
          y: spec.y ?? null,
          aggregate: spec.aggregate ?? null,
          options: spec.options ?? {},
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Chart data failed: ${text}` },
        { status: res.status },
      );
    }

    const data = (await res.json()) as ChartDataResponse;
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
