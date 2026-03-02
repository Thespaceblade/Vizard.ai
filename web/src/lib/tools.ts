const PYTHON_SERVICE_URL =
  process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

export interface InspectSchemaField {
  name: string;
  dtype: string;
  non_null: number;
  unique: number;
}

export interface VizSuggestion {
  viz_type: string;
  x: string | null;
  y: string | null;
  label: string;
}

export interface InspectResponse {
  schema: InspectSchemaField[];
  sample: Record<string, unknown>[];
  stats: Record<string, Record<string, number>>;
  suggestions: VizSuggestion[];
}

export interface CleanResponse {
  csv_base64: string;
}

export type VizType =
  | "bar"
  | "line"
  | "scatter"
  | "histogram"
  | "choropleth"
  | "treemap"
  | "heatmap"
  | "scatter_geo";

export interface VizSpec {
  viz_type: VizType;
  x?: string | null;
  y?: string | null;
  aggregate?: "sum" | "mean" | "avg" | null;
  theme?: "minimal" | "bold" | "corporate" | string | null;
  options?: {
    scope?: string;
    locationmode?: string;
    color?: string;
    /** Enable zoom/pan on maps and large charts for clarity. */
    zoom?: boolean;
    /** Animate change over a time column (e.g. time series or chronological). */
    animate_time?: boolean;
    /** Column name for time animation. */
    time_column?: string;
    [key: string]: unknown;
  } | null;
  cleaning_instructions?: string | null;
  explanation?: string | null;
  dynamic?: boolean | null;
}

export interface StaticVizResponse {
  image_base64: string;
  format: string;
}

export interface DynamicVizResponse {
  html: string;
}

async function postJson<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(`${PYTHON_SERVICE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Python service error (${res.status}): ${text}`);
  }

  return (await res.json()) as T;
}

export async function inspectData(
  csvBase64: string,
  signal?: AbortSignal,
): Promise<InspectResponse> {
  return postJson<InspectResponse>(
    "/inspect",
    { csv_base64: csvBase64 },
    signal,
  );
}

export async function cleanData(
  csvBase64: string,
  instructions: string | null,
  signal?: AbortSignal,
): Promise<CleanResponse> {
  return postJson<CleanResponse>(
    "/clean",
    { csv_base64: csvBase64, instructions },
    signal,
  );
}

export async function createStaticViz(
  csvBase64: string,
  spec: VizSpec,
  outputFormat: "png" | "pdf" = "png",
  signal?: AbortSignal,
): Promise<StaticVizResponse> {
  return postJson<StaticVizResponse>(
    "/viz",
    {
      csv_base64: csvBase64,
      spec: {
        viz_type: spec.viz_type,
        x: spec.x,
        y: spec.y,
        aggregate: spec.aggregate,
        theme: spec.theme ?? "minimal",
        options: spec.options ?? {},
        prompt: spec.explanation,
      },
      output_format: outputFormat,
    },
    signal,
  );
}

export async function createDynamicViz(
  csvBase64: string,
  spec: VizSpec,
  signal?: AbortSignal,
): Promise<DynamicVizResponse> {
  return postJson<DynamicVizResponse>(
    "/dynamic-viz",
    {
      csv_base64: csvBase64,
      spec: {
        viz_type: spec.viz_type,
        x: spec.x,
        y: spec.y,
        aggregate: spec.aggregate,
        theme: spec.theme ?? "minimal",
        options: spec.options ?? {},
        prompt: spec.explanation,
      },
    },
    signal,
  );
}
