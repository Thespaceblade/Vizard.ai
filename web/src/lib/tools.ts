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
