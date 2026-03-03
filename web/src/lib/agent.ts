import {
  inspectData,
  cleanData,
  createStaticViz,
  createDynamicViz,
  type VizSpec,
  type VizSuggestion,
} from "./tools";

/** Phase ids for workflow-based loading UI. */
export type AgentPhase = "inspect" | "plan" | "clean" | "render";

export interface AgentInput {
  csvBase64: string;
  prompt: string;
  /** When provided (e.g. from a quick idea), skip LLM and use this spec directly. */
  spec?: Partial<VizSpec> | null;
  /** Called before each pipeline step so the UI can show phase-specific loading. */
  onPhase?: (phase: AgentPhase) => void;
}

export interface AgentStaticResult {
  kind: "static";
  imageBase64: string;
  explanation?: string;
  suggestions?: VizSuggestion[];
  spec?: VizSpec;
}

export interface AgentDynamicResult {
  kind: "dynamic";
  html: string;
  explanation?: string;
  suggestions?: VizSuggestion[];
  spec?: VizSpec;
}

export type AgentResult = AgentStaticResult | AgentDynamicResult;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function callGemini(prompt: string): Promise<string | null> {
  if (!GEMINI_API_KEY) {
    return null;
  }

  const endpoint =
    "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent";

  const res = await fetch(`${endpoint}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3 },
    }),
  });

  if (!res.ok) {
    console.error("Gemini API error", res.status, await res.text());
    return null;
  }

  const data = (await res.json()) as unknown;
  const candidate = (data as { candidates?: unknown[] })?.candidates?.[0] as
    | { content?: { parts?: Array<{ text?: string }> } }
    | undefined;

  const parts = candidate?.content?.parts ?? [];
  const text = parts
    .map((p) => p.text)
    .filter(Boolean)
    .join("\n");

  if (typeof text !== "string") return null;
  return text.trim();
}

function deriveHeuristicSpec(
  prompt: string,
  insight: Awaited<ReturnType<typeof inspectData>>,
): VizSpec {
  const numericCols = Object.keys(insight.stats ?? {});
  const schema = insight.schema;
  const nonNumericCols = schema
    .filter((f) => !numericCols.includes(f.name))
    .map((f) => f.name);

  const wantsDynamic =
    /interactive|dynamic|hover|zoom|animated|plotly/i.test(prompt);
  const wantsMap =
    /map|choropleth|geo|country|countries|world|globe|heat|cluster/i.test(
      prompt,
    );
  const wantsZoom = /zoom|pan|explore/i.test(prompt);
  const wantsAnimate = /animate|chronological|over time|change over/i.test(prompt);

  const timeColNames = ["date", "time", "year", "month", "timestamp"];
  const timeCol = schema.find(
    (f) =>
      timeColNames.some((k) => f.name.toLowerCase().includes(k)) ||
      /date|time|datetime/i.test(f.dtype),
  )?.name;
  const hasSpatialNames = ["lat", "lon", "latitude", "longitude", "country", "state", "region", "city"];
  const latCol = schema.find((f) =>
    /lat|latitude/i.test(f.name),
  )?.name;
  const lonCol = schema.find((f) =>
    /lon|longitude/i.test(f.name),
  )?.name;
  const hasLatLon = Boolean(latCol && lonCol);
  const geoNameCol = schema.find((f) =>
    hasSpatialNames.some((k) => f.name.toLowerCase().includes(k)),
  )?.name;
  const maxCategoricalUnique = Math.max(
    0,
    ...schema
      .filter((f) => nonNumericCols.includes(f.name))
      .map((f) => f.unique ?? 0),
  );
  const manyCategories = maxCategoricalUnique > 10;

  let viz_type: VizSpec["viz_type"] = "histogram";
  if (wantsMap || hasLatLon || geoNameCol) {
    if (hasLatLon && (/heat|cluster|point|dot/i.test(prompt) || !geoNameCol)) {
      viz_type = "scatter_geo";
    } else {
      viz_type = "choropleth";
    }
  } else if (timeCol && numericCols.length > 0) {
    viz_type = "line";
  } else if (/time|date|year|trend/i.test(prompt) && numericCols.length > 0) {
    viz_type = "line";
  } else if (/scatter|relationship|correlat/i.test(prompt)) {
    viz_type = "scatter";
  } else if (/bar|compare|category|group/i.test(prompt) || (nonNumericCols.length > 0 && numericCols.length > 0)) {
    viz_type = manyCategories ? "treemap" : "bar";
  } else if (/treemap|tree map/i.test(prompt)) {
    viz_type = "treemap";
  }

  const y =
    numericCols[0] ??
    schema.find((f) => f.dtype.includes("float") || f.dtype.includes("int"))
      ?.name ??
    null;

  const x =
    nonNumericCols[0] ??
    schema.find((f) => !f.dtype.includes("float") && !f.dtype.includes("int"))
      ?.name ??
    null;

  const themeMatch = prompt.match(/(minimal|bold|corporate)/i);
  const theme =
    (themeMatch?.[1]?.toLowerCase() as VizSpec["theme"]) ?? "minimal";

  const options: VizSpec["options"] = {};
  const scopeMatch = prompt.match(
    /\b(world|usa|europe|asia|africa|north america|south america)\b/i,
  );
  if (scopeMatch) {
    options.scope = scopeMatch[1].toLowerCase();
  }
  options.zoom = wantsZoom || viz_type === "choropleth" || viz_type === "scatter_geo";
  if (timeCol && (viz_type === "line" || wantsAnimate)) {
    options.animate_time = true;
    options.time_column = timeCol;
  }
  if (viz_type === "scatter_geo" && latCol && lonCol) {
    options.lat = latCol;
    options.lon = lonCol;
  }
  if (geoNameCol && viz_type === "choropleth") {
    options.location_column = geoNameCol;
  }

  return {
    viz_type,
    x,
    y,
    aggregate: viz_type === "bar" || viz_type === "treemap" ? "sum" : null,
    theme,
    options,
    cleaning_instructions: null,
    explanation: null,
    dynamic:
      wantsDynamic ||
      viz_type === "choropleth" ||
      viz_type === "scatter_geo" ||
      viz_type === "treemap" ||
      (viz_type === "line" && Boolean(timeCol)),
  };
}

function extractJsonFromText(text: string): unknown | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

async function deriveSpecWithLLM(
  userPrompt: string,
  insight: Awaited<ReturnType<typeof inspectData>>,
): Promise<VizSpec> {
  const schemaPreview = insight.schema
    .map((f) => `${f.name} (${f.dtype})`)
    .join(", ");

  const systemPrompt = [
    "You are a visualization planning agent for Vizard.ai. You decide chart type from the DATA and the user prompt.",
    "The user uploads a CSV and gives a natural language prompt. Respond with a SINGLE JSON object. No text outside the JSON.",
    "",
    "JSON shape:",
    "{",
    '  "viz_type": "bar" | "line" | "scatter" | "histogram" | "choropleth" | "treemap" | "heatmap" | "scatter_geo",',
    '  "x": string | null,',
    '  "y": string | null,',
    '  "aggregate": "sum" | "mean" | "avg" | null,',
    '  "theme": "minimal" | "bold" | "corporate",',
    '  "options": { "scope"?: string, "locationmode"?: string, "color"?: string, "zoom"?: boolean, "animate_time"?: boolean, "time_column"?: string, "lat"?: string, "lon"?: string },',
    '  "cleaning_instructions": string | null,',
    '  "explanation": string | null,',
    '  "dynamic": boolean',
    "}",
    "",
    "Data-driven rules (you make these decisions):",
    "- Numerical + time column (date/time/year/month): use line or time series. Set options.animate_time=true and options.time_column to the time column for chronological animation.",
    "- Categorical data: use bar when few categories (labels stay readable); use treemap when many categories (avoid overcrowding, show proportions clearly).",
    "- Spatial data: if latitude/longitude columns exist use scatter_geo (points or clusters); if country/state/region names use choropleth. Set options.zoom=true for maps.",
    "- Two numeric columns, no time: scatter. Single numeric distribution: histogram.",
    "- Prefer clarity: choose the chart that shows noticeable differences and keeps labels readable.",
    "- When the user asks for interactive/zoom/animated/chronological, set dynamic=true and set options.zoom or options.animate_time as appropriate.",
    "",
    "Choropleth: options.scope can be world, usa, europe, asia, africa, north america, south america; options.locationmode can be country names, ISO-3, USA-states.",
    "Use only column names that exist in the schema. Provide a short explanation of your choice.",
  ].join("\n");

  const llmInput = [
    systemPrompt,
    "",
    `Schema: ${schemaPreview}`,
    "",
    `User prompt: ${userPrompt}`,
  ].join("\n");

  const llmText = await callGemini(llmInput);
  if (!llmText) {
    return deriveHeuristicSpec(userPrompt, insight);
  }

  const parsed = extractJsonFromText(llmText) as Partial<VizSpec> | null;
  if (!parsed || !parsed.viz_type) {
    return deriveHeuristicSpec(userPrompt, insight);
  }

  const fallback = deriveHeuristicSpec(userPrompt, insight);
  const opts = (parsed.options as VizSpec["options"]) ?? fallback.options ?? {};

  return {
    viz_type: (parsed.viz_type as VizSpec["viz_type"]) ?? fallback.viz_type,
    x: parsed.x ?? null,
    y: parsed.y ?? null,
    aggregate: parsed.aggregate ?? null,
    theme: (parsed.theme as VizSpec["theme"]) ?? "minimal",
    options: opts,
    cleaning_instructions: parsed.cleaning_instructions ?? null,
    explanation: parsed.explanation ?? null,
    dynamic: parsed.dynamic ?? false,
  };
}

function suggestionSpecToFullSpec(partial: Partial<VizSpec>): VizSpec {
  return {
    viz_type: (partial.viz_type as VizSpec["viz_type"]) ?? "bar",
    x: partial.x ?? null,
    y: partial.y ?? null,
    aggregate: partial.aggregate ?? null,
    theme: (partial.theme as VizSpec["theme"]) ?? "minimal",
    options: partial.options ?? {},
    cleaning_instructions: partial.cleaning_instructions ?? null,
    explanation: partial.explanation ?? null,
    dynamic:
      partial.dynamic ??
      (partial.viz_type === "choropleth" ||
        partial.viz_type === "scatter_geo" ||
        partial.viz_type === "treemap"),
  };
}

export async function runAgent(input: AgentInput): Promise<AgentResult> {
  const { csvBase64, prompt, spec: inputSpec, onPhase } = input;

  onPhase?.("inspect");
  const insight = await inspectData(csvBase64);

  let spec: VizSpec;
  if (inputSpec) {
    spec = suggestionSpecToFullSpec(inputSpec);
  } else {
    onPhase?.("plan");
    spec = await deriveSpecWithLLM(prompt, insight);
  }

  let workingCsv = csvBase64;
  if (spec.cleaning_instructions) {
    onPhase?.("clean");
    const cleaned = await cleanData(csvBase64, spec.cleaning_instructions);
    workingCsv = cleaned.csv_base64;
  }

  const suggestions = insight.suggestions;

  onPhase?.("render");
  if (spec.dynamic) {
    const dynamic = await createDynamicViz(workingCsv, spec);
    return {
      kind: "dynamic",
      html: dynamic.html,
      explanation: spec.explanation ?? undefined,
      suggestions,
      spec,
    };
  }

  const viz = await createStaticViz(workingCsv, spec);
  return {
    kind: "static",
    imageBase64: viz.image_base64,
    explanation: spec.explanation ?? undefined,
    suggestions,
    spec,
  };
}
