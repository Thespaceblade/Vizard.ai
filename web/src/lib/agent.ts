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

export interface AgentD3CodeResult {
  kind: "d3code";
  html: string;
  explanation?: string;
  suggestions?: VizSuggestion[];
}

export type AgentResult = AgentStaticResult | AgentDynamicResult | AgentD3CodeResult;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-2.5-flash";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const AGENT_REQUIRE_LLM = process.env.AGENT_REQUIRE_LLM === "true";

async function callOpenAI(prompt: string): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;

  const doRequest = async (): Promise<Response> =>
    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

  let res = await doRequest();
  if (res.status === 429) {
    console.warn("[Vizard] OpenAI rate limited (429); retrying once after 2s…");
    await new Promise((r) => setTimeout(r, 2000));
    res = await doRequest();
  }

  if (!res.ok) {
    const body = await res.text();
    console.error("[Vizard] OpenAI API error", res.status, body.slice(0, 300));
    return null;
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string") return null;
  return text.trim();
}

/** Tool declarations for Gemini function calling. Model can call these based on data and prompt. */
const VIZ_AGENT_TOOLS = {
  functionDeclarations: [
    {
      name: "create_visualization",
      description:
        "Create one visualization from the dataset. Choose type from: time series (line with time_column), categorical (bar or treemap), spatial (choropleth or scatter_geo), distributions (histogram, scatter). Use dynamic=true for interactive charts (zoom, hover, time animation).",
      parameters: {
        type: "object",
        properties: {
          viz_type: {
            type: "string",
            enum: [
              "bar",
              "line",
              "scatter",
              "histogram",
              "choropleth",
              "treemap",
              "heatmap",
              "scatter_geo",
            ],
            description: "Chart type",
          },
          x: { type: "string", description: "Column name for x/category (null for histogram)" },
          y: { type: "string", description: "Column name for y/value" },
          aggregate: {
            type: "string",
            enum: ["sum", "mean", "avg"],
            description: "Aggregation for bar/treemap",
          },
          theme: {
            type: "string",
            enum: ["minimal", "bold", "corporate"],
          },
          dynamic: {
            type: "boolean",
            description: "True for interactive (zoom, hover, animation)",
          },
          explanation: { type: "string", description: "Short explanation for the user" },
          options: {
            type: "object",
            properties: {
              scope: { type: "string" },
              time_column: { type: "string" },
              animate_time: { type: "boolean" },
              zoom: { type: "boolean" },
              lat: { type: "string" },
              lon: { type: "string" },
              location_column: { type: "string" },
            },
          },
          cleaning_instructions: {
            type: "string",
            description:
              "Optional: e.g. 'drop duplicates', 'drop nulls', 'strip whitespace', 'lowercase'",
          },
        },
      },
    },
    {
      name: "clean_data",
      description:
        "Clean the dataset before visualizing. Use when you need to drop duplicates, drop null rows, strip whitespace, or lowercase text. Pass instructions like 'drop duplicates' or 'drop nulls'.",
      parameters: {
        type: "object",
        properties: {
          instructions: {
            type: "string",
            description: "e.g. 'drop duplicates', 'drop nulls', 'strip whitespace'",
          },
        },
      },
    },
  ],
};

type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | { functionResponse: { name: string; response: Record<string, unknown> } };

type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

type ToolCallResult =
  | { type: "text"; text: string }
  | { type: "functionCall"; name: string; args: Record<string, unknown> };

async function callGeminiWithTools(
  contents: GeminiContent[],
): Promise<ToolCallResult | null> {
  if (!GEMINI_API_KEY) return null;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const doRequest = async (): Promise<Response> =>
    fetch(`${endpoint}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.3 },
        tools: [{ functionDeclarations: VIZ_AGENT_TOOLS.functionDeclarations }],
      }),
    });
  let res = await doRequest();
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 2000));
    res = await doRequest();
  }
  if (!res.ok) {
    console.error("Gemini API error", res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
  };
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const functionCall = parts.find(
    (p): p is { functionCall: { name: string; args: Record<string, unknown> } } =>
      "functionCall" in p && p.functionCall != null,
  );
  if (functionCall) {
    return {
      type: "functionCall",
      name: functionCall.functionCall.name,
      args: functionCall.functionCall.args ?? {},
    };
  }
  const text = parts
    .map((p) => ("text" in p ? p.text : null))
    .filter(Boolean)
    .join("\n");
  if (typeof text === "string" && text.trim()) {
    return { type: "text", text: text.trim() };
  }
  return null;
}

async function callGemini(prompt: string): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  const doRequest = async (): Promise<Response> =>
    fetch(`${endpoint}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3 },
      }),
    });

  let res = await doRequest();

  if (res.status === 429) {
    console.warn("[Vizard] Gemini rate limited (429); retrying once after 2s…");
    await new Promise((r) => setTimeout(r, 2000));
    res = await doRequest();
  }

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 404) {
      console.error(
        "[Vizard] Gemini 404: model not found.",
        "Try setting GEMINI_MODEL in .env.local (e.g. gemini-1.5-flash or gemini-1.5-flash-001).",
        "Response:",
        body.slice(0, 200),
      );
    } else {
      console.error("Gemini API error", res.status, body);
    }
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

/** Calls OpenAI if OPENAI_API_KEY is set, otherwise Gemini if GEMINI_API_KEY is set. Same prompt, same JSON response. */
async function callLLM(prompt: string): Promise<string | null> {
  if (OPENAI_API_KEY) {
    const text = await callOpenAI(prompt);
    if (text != null) return text;
  }
  if (GEMINI_API_KEY) {
    const text = await callGemini(prompt);
    if (text != null) return text;
  }
  if (!OPENAI_API_KEY && !GEMINI_API_KEY) {
    console.warn(
      "[Vizard] No LLM key set. Chart type will be chosen by heuristics. Add OPENAI_API_KEY or GEMINI_API_KEY to web/.env.local and restart.",
    );
  }
  return null;
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
    explanation:
      "Planned without LLM: heuristic chart choice based on schema, sample rows, and your prompt.",
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

function formatSampleForLLM(sample: Record<string, unknown>[]): string {
  if (sample.length === 0) return "(no rows)";
  const keys = Object.keys(sample[0] ?? {});
  if (keys.length === 0) return "(no columns)";
  const header = keys.join("\t");
  const rows = sample.slice(0, 8).map((row) =>
    keys.map((k) => String((row ?? {})[k] ?? "")).join("\t"),
  );
  return [header, ...rows].join("\n");
}

function formatStatsForLLM(stats: Record<string, Record<string, number>> | undefined): string {
  if (!stats || Object.keys(stats).length === 0) return "(no numeric columns)";
  const lines = Object.entries(stats).map(([col, s]) => {
    const mean = s.mean != null ? `mean=${s.mean.toFixed(2)}` : "";
    const min = s.min != null ? `min=${s.min}` : "";
    const max = s.max != null ? `max=${s.max}` : "";
    const parts = [mean, min, max].filter(Boolean);
    return `  ${col}: ${parts.join(", ")}`;
  });
  return lines.join("\n");
}

async function deriveSpecWithLLM(
  userPrompt: string,
  insight: Awaited<ReturnType<typeof inspectData>>,
): Promise<VizSpec> {
  const schemaPreview = insight.schema
    .map((f) => `${f.name} (${f.dtype})`)
    .join(", ");
  const samplePreview = formatSampleForLLM(insight.sample ?? []);
  const statsPreview = formatStatsForLLM(insight.stats);

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
    "Schema (column names and types):",
    schemaPreview,
    "",
    "Sample rows (first few):",
    samplePreview,
    "",
    "Numeric column stats (if any):",
    statsPreview,
    "",
    "User prompt:",
    userPrompt,
  ].join("\n\n");

  const llmText = await callLLM(llmInput);
  if (!llmText) {
    if (AGENT_REQUIRE_LLM) {
      throw new Error(
        "LLM unavailable for planning (no valid OPENAI_API_KEY or GEMINI_API_KEY, or upstream error). Update web/.env.local or unset AGENT_REQUIRE_LLM.",
      );
    }
    return deriveHeuristicSpec(userPrompt, insight);
  }

  const parsed = extractJsonFromText(llmText) as Partial<VizSpec> | null;
  if (!parsed || !parsed.viz_type) {
    if (AGENT_REQUIRE_LLM) {
      throw new Error(
        "LLM returned an invalid response for visualization planning while AGENT_REQUIRE_LLM is enabled.",
      );
    }
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

/** Build VizSpec from tool call args (create_visualization). */
function argsToVizSpec(args: Record<string, unknown>, fallback: VizSpec): VizSpec {
  const opts = (args.options as VizSpec["options"]) ?? fallback.options ?? {};
  return {
    viz_type: (args.viz_type as VizSpec["viz_type"]) ?? fallback.viz_type,
    x: (args.x as string) ?? null,
    y: (args.y as string) ?? null,
    aggregate: (args.aggregate as VizSpec["aggregate"]) ?? null,
    theme: (args.theme as VizSpec["theme"]) ?? "minimal",
    options: opts,
    cleaning_instructions: (args.cleaning_instructions as string) ?? null,
    explanation: (args.explanation as string) ?? null,
    dynamic: Boolean(args.dynamic),
  };
}

const MAX_TOOL_LOOP_TURNS = 5;

/**
 * Run agent with tool-calling loop: LLM can call create_visualization or clean_data.
 * Returns spec (and workingCsv) to then render in runAgent.
 */
async function runAgentWithToolLoop(
  csvBase64: string,
  prompt: string,
  insight: Awaited<ReturnType<typeof inspectData>>,
  onPhase?: (phase: AgentPhase) => void,
): Promise<{ spec: VizSpec; workingCsv: string } | null> {
  const schemaPreview = insight.schema
    .map((f) => `${f.name} (${f.dtype})`)
    .join(", ");
  const samplePreview = formatSampleForLLM(insight.sample ?? []);
  const statsPreview = formatStatsForLLM(insight.stats);
  const userMessage = [
    "You have access to the dataset summary below. Use the create_visualization tool to produce one chart, or clean_data first if needed (e.g. drop duplicates, drop nulls).",
    "",
    "Schema:",
    schemaPreview,
    "",
    "Sample rows:",
    samplePreview,
    "",
    "Numeric stats:",
    statsPreview,
    "",
    "User request:",
    prompt,
  ].join("\n\n");

  let workingCsv = csvBase64;
  let currentInsight = insight;
  const contents: GeminiContent[] = [
    { role: "user", parts: [{ text: userMessage }] },
  ];

  for (let turn = 0; turn < MAX_TOOL_LOOP_TURNS; turn++) {
    onPhase?.("plan");
    const result = await callGeminiWithTools(contents);
    if (!result) break;

    if (result.type === "functionCall") {
      if (result.name === "clean_data") {
        const instructions = (result.args.instructions as string) ?? "";
        onPhase?.("clean");
        const cleaned = await cleanData(workingCsv, instructions || null);
        workingCsv = cleaned.csv_base64;
        currentInsight = await inspectData(workingCsv);
        contents.push(
          { role: "model", parts: [{ functionCall: { name: result.name, args: result.args } }] },
          {
            role: "user",
            parts: [
              {
                functionResponse: {
                  name: result.name,
                  response: {
                    status: "ok",
                    message: "Data cleaned. You can now call create_visualization.",
                  },
                },
              },
            ],
          },
        );
        continue;
      }

      if (result.name === "create_visualization") {
        const fallback = deriveHeuristicSpec(prompt, currentInsight);
        const spec = argsToVizSpec(result.args, fallback);
        return { spec, workingCsv };
      }
    }

    if (result.type === "text") {
      const parsed = extractJsonFromText(result.text) as Partial<VizSpec> | null;
      if (parsed?.viz_type) {
        const fallback = deriveHeuristicSpec(prompt, currentInsight);
        const spec = suggestionSpecToFullSpec({
          ...parsed,
          options: (parsed.options as VizSpec["options"]) ?? fallback.options,
        });
        return { spec, workingCsv };
      }
    }
    break;
  }
  return null;
}

export async function runAgent(input: AgentInput): Promise<AgentResult> {
  const { csvBase64, prompt, spec: inputSpec, onPhase } = input;

  onPhase?.("inspect");
  const insight = await inspectData(csvBase64);

  let spec: VizSpec;
  let workingCsv = csvBase64;

  if (inputSpec) {
    spec = suggestionSpecToFullSpec(inputSpec);
  } else {
    onPhase?.("plan");
    const toolResult = await runAgentWithToolLoop(
      csvBase64,
      prompt,
      insight,
      onPhase,
    );
    if (toolResult) {
      spec = toolResult.spec;
      workingCsv = toolResult.workingCsv;
    } else {
      spec = await deriveSpecWithLLM(prompt, insight);
    }
  }

  if (spec.cleaning_instructions) {
    onPhase?.("clean");
    const cleaned = await cleanData(workingCsv, spec.cleaning_instructions);
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

// ---------------------------------------------------------------------------
// D3 Code Generation Agent (Multi-Agent Framework)
// ---------------------------------------------------------------------------

import { MasterAgent } from "./multi-agent";

export async function runCodeGenAgent(input: AgentInput): Promise<AgentResult> {
  const { csvBase64, prompt, onPhase } = input;

  const master = new MasterAgent({ model: "gemini-2.5-flash" });

  const result = await master.runD3CodeWorkflow(
    csvBase64,
    prompt,
    onPhase as ((phase: string) => void) | undefined,
  );

  // Also get suggestions from the inspect call for the sidebar
  const insight = await inspectData(csvBase64);

  return {
    kind: "d3code",
    html: result.html,
    explanation: result.explanation + (result.error ? ` (${result.error})` : ""),
    suggestions: insight.suggestions,
  };
}
