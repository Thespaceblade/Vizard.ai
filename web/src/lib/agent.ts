import {
  inspectData,
  cleanData,
  createStaticViz,
  createDynamicViz,
  type VizSpec,
  type VizSuggestion,
} from "./tools";

export interface AgentInput {
  csvBase64: string;
  prompt: string;
}

export interface AgentStaticResult {
  kind: "static";
  imageBase64: string;
  explanation?: string;
  suggestions?: VizSuggestion[];
}

export interface AgentDynamicResult {
  kind: "dynamic";
  html: string;
  explanation?: string;
  suggestions?: VizSuggestion[];
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
  const wantsMap = /map|choropleth|geo|country|countries|world|globe/i.test(
    prompt,
  );

  let viz_type: VizSpec["viz_type"] = "histogram";
  if (wantsMap) {
    viz_type = "choropleth";
  } else if (/time|date|year|trend/i.test(prompt)) {
    viz_type = "line";
  } else if (/scatter|relationship|correlat/i.test(prompt)) {
    viz_type = "scatter";
  } else if (/bar|compare|category|group/i.test(prompt)) {
    viz_type = "bar";
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

  const options: Record<string, unknown> = {};
  const scopeMatch = prompt.match(
    /\b(world|usa|europe|asia|africa|north america|south america)\b/i,
  );
  if (scopeMatch) {
    options["scope"] = scopeMatch[1].toLowerCase();
  }

  return {
    viz_type,
    x,
    y,
    aggregate: viz_type === "bar" ? "sum" : null,
    theme,
    options,
    cleaning_instructions: null,
    explanation: null,
    dynamic: wantsDynamic || viz_type === "choropleth",
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
    "You are a visualization planning agent for Vizard.ai.",
    "The user uploads a CSV and gives a natural language prompt.",
    "Respond with a SINGLE JSON object. No text outside the JSON.",
    "",
    "JSON shape:",
    "{",
    '  "viz_type": "bar" | "line" | "scatter" | "histogram" | "choropleth",',
    '  "x": string | null,',
    '  "y": string | null,',
    '  "aggregate": "sum" | "mean" | "avg" | null,',
    '  "theme": "minimal" | "bold" | "corporate",',
    '  "options": { "scope"?: string, "locationmode"?: string, "color"?: string },',
    '  "cleaning_instructions": string | null,',
    '  "explanation": string | null,',
    '  "dynamic": boolean',
    "}",
    "",
    "Rules:",
    '- For geographic/country data use "choropleth" and set dynamic=true.',
    "- For time series use line charts.",
    "- For category comparisons use bar charts.",
    "- For distributions use histograms.",
    "- For relationships between two numeric columns use scatter.",
    '- Set dynamic=true when the user asks for interactive/dynamic/hover/animated charts.',
    '- For choropleth: options.scope can be "world","usa","europe","asia","africa","north america","south america".',
    '- For choropleth: options.locationmode is "country names" or "ISO-3" or "USA-states".',
    "- Use column names that exist in the schema.",
    "- Provide a short explanation of your choice.",
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

  return {
    viz_type:
      parsed.viz_type ?? deriveHeuristicSpec(userPrompt, insight).viz_type,
    x: parsed.x ?? null,
    y: parsed.y ?? null,
    aggregate: parsed.aggregate ?? null,
    theme: (parsed.theme as VizSpec["theme"]) ?? "minimal",
    options: parsed.options ?? {},
    cleaning_instructions: parsed.cleaning_instructions ?? null,
    explanation: parsed.explanation ?? null,
    dynamic: parsed.dynamic ?? false,
  };
}

export async function runAgent(input: AgentInput): Promise<AgentResult> {
  const { csvBase64, prompt } = input;

  const insight = await inspectData(csvBase64);
  const spec = await deriveSpecWithLLM(prompt, insight);

  let workingCsv = csvBase64;
  if (spec.cleaning_instructions) {
    const cleaned = await cleanData(csvBase64, spec.cleaning_instructions);
    workingCsv = cleaned.csv_base64;
  }

  const suggestions = insight.suggestions;

  if (spec.dynamic) {
    const dynamic = await createDynamicViz(workingCsv, spec);
    return {
      kind: "dynamic",
      html: dynamic.html,
      explanation: spec.explanation ?? undefined,
      suggestions,
    };
  }

  const viz = await createStaticViz(workingCsv, spec);
  return {
    kind: "static",
    imageBase64: viz.image_base64,
    explanation: spec.explanation ?? undefined,
    suggestions,
  };
}
