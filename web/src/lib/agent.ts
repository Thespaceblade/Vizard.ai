import {
  inspectData,
  cleanData,
  type VizSuggestion,
} from "./tools";
import { GLOBE_TEMPLATE, BAR_TEMPLATE, SCATTER_TEMPLATE, LINE_TEMPLATE } from "./templates";


export interface AgentInput {
  csvBase64: string;
  prompt: string;
}

export interface AgentResult {
  kind: "dynamic";
  html: string;
  explanation?: string;
  suggestions?: VizSuggestion[];
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// ---------------------------------------------------------------------------
// Gemini API caller
// ---------------------------------------------------------------------------

async function callGemini(prompt: string): Promise<string | null> {
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is missing");
    return null;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  try {
    const res = await fetch(`${endpoint}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4 },
      }),
    });

    if (res.status === 429) {
      console.warn("[Vizard] Gemini rate limited (429); retrying after 2s…");
      await new Promise((r) => setTimeout(r, 2000));
      const retry = await fetch(`${endpoint}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4 },
        }),
      });
      if (!retry.ok) {
        console.error(`Gemini retry failed (${retry.status})`);
        return null;
      }
      const retryData = (await retry.json()) as any;
      return retryData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
    }

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Gemini API error (${res.status}):`, errorText);
      return null;
    }

    const data = (await res.json()) as any;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") {
      console.warn("Gemini returned empty or invalid response", data);
      return null;
    }
    return text.trim();
  } catch (err) {
    console.error("Fetch error while calling Gemini:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers for formatting data context for the LLM
// ---------------------------------------------------------------------------

function formatSampleForPrompt(sample: Record<string, unknown>[]): string {
  if (sample.length === 0) return "(no rows)";
  const keys = Object.keys(sample[0] ?? {});
  if (keys.length === 0) return "(no columns)";
  const header = keys.join("\t");
  const rows = sample.slice(0, 8).map((row) =>
    keys.map((k) => String((row ?? {})[k] ?? "")).join("\t"),
  );
  return [header, ...rows].join("\n");
}

function formatStatsForPrompt(stats: Record<string, Record<string, number>> | undefined): string {
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

function csvBase64ToText(csvBase64: string): string {
  return Buffer.from(csvBase64, "base64").toString("utf-8");
}

// ---------------------------------------------------------------------------
// Extract HTML from LLM response (may be wrapped in code fences)
// ---------------------------------------------------------------------------

function extractHtmlFromResponse(text: string): string | null {
  // Try to extract from ```html ... ``` code fence
  const fenceMatch = text.match(/```html\s*\n([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // Try to extract from ``` ... ``` (no language tag)
  const genericFence = text.match(/```\s*\n([\s\S]*?)```/);
  if (genericFence && genericFence[1].includes("<!DOCTYPE") || genericFence && genericFence[1].includes("<html")) {
    return genericFence[1].trim();
  }

  // If the response itself starts with <!DOCTYPE or <html, use it directly
  const trimmed = text.trim();
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
    return trimmed;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Extract explanation from LLM response (text outside the HTML block)
// ---------------------------------------------------------------------------

function cleanExplanationText(raw: string): string {
  return raw
    .replace(/\*\*/g, "")       // remove bold markers
    .replace(/\*/g, "")        // remove italic markers
    .replace(/^#+\s*/gm, "")   // remove heading markers
    .replace(/^[-•]\s*/gm, "") // remove list bullets
    .replace(/`/g, "")         // remove code backticks
    .replace(/\n{3,}/g, "\n\n") // collapse excessive newlines
    .trim();
}

function extractExplanation(text: string): string | null {
  // Get text before the code fence
  const beforeFence = text.split(/```/)[0]?.trim();
  if (beforeFence && beforeFence.length > 10 && !beforeFence.startsWith("<!DOCTYPE")) {
    return cleanExplanationText(beforeFence);
  }
  // Get text after the closing fence
  const parts = text.split(/```/);
  if (parts.length >= 3) {
    const afterFence = parts[parts.length - 1]?.trim();
    if (afterFence && afterFence.length > 10) return cleanExplanationText(afterFence);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Build the D3 generation prompt
// ---------------------------------------------------------------------------

function buildD3Prompt(
  userPrompt: string,
  schemaPreview: string,
  samplePreview: string,
  statsPreview: string,
  csvText: string,
  templateString: string | null,
  vizType: string,
): string {
  const basePrompt = [
    "You are a D3.js visualization expert for Vizard.ai.",
    "The user uploads CSV data and describes what they want to see.",
    "Your job is to write a COMPLETE, SELF-CONTAINED HTML page that uses D3.js v7 to visualize the data.",
    "",
    "CRITICAL RULES:",
    "1. Include `<script src=\"https://d3js.org/d3.v7.min.js\"></script>` in the <head>.",
    "2. For geographic visualizations (globes, maps, projections), also include `<script src=\"https://d3js.org/topojson.v3.min.js\"></script>` and fetch world data from `https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json`.",
    "3. Embed the CSV data directly as a JavaScript string variable inside a <script> tag, then parse it with `d3.csvParse()`.",
    "4. The visualization must be responsive — use `window.innerWidth` and `window.innerHeight` for sizing.",
    "5. Use a clean, modern light theme: white background (`#ffffff`), slate text (`#334155`), and the Vizard color palette: `['#1e3a5f', '#0d9488', '#c2410c', '#475569', '#1d4ed8', '#0f766e']`.",
    "6. Add tooltips on hover showing the data values.",
    "7. Add smooth transitions and animations (e.g. bars growing from 0, lines drawing in, globe spinning).",
    "8. Include axis labels, a title, and a legend where appropriate.",
    "9. Use the Inter font from Google Fonts: `<link href=\"https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap\" rel=\"stylesheet\">`.",
    "10. Make interactive features: draggable globe rotation, zoomable charts, hoverable data points.",
    "11. The page must work standalone — no external dependencies other than D3, TopoJSON, Google Fonts, and world-atlas CDN.",
    "12. Return ONLY the HTML inside a ```html code fence.",
    "13. Before or after the HTML fence, include a brief 1-2 sentence explanation. This explanation should focus on what the DATA shows (patterns, trends, outliers, comparisons) and why this visualization style helps the user understand it. Do NOT describe colors, fonts, technical D3 details, or implementation choices. Write in plain conversational English with no asterisks, markdown formatting, or bullet points.",
    "",
  ];

  if (templateString) {
    basePrompt.push(
      `TEMPLATE INSTRUCTION:`,
      `I have provided a pre-built robust boilerplate template for a ${vizType.toUpperCase()} chart below.`,
      `Your task is to INJECT the data into this template, configure the data parsing, setup the tooltips, add the axis scales, and make any aesthetic changes requested.`,
      `DO NOT break or remove the core pre-written interactivity (e.g., drag/zoom handlers). Build UPON it.`,
      `Return the FINAL combined HTML.`,
      "",
      "```html",
      templateString,
      "```",
      ""
    );
  }

  basePrompt.push(
    "DATA CONTEXT:",
    "",
    "Schema (column names and types):",
    schemaPreview,
    "",
    "Sample rows:",
    samplePreview,
    "",
    "Numeric column stats:",
    statsPreview,
    "",
    "Full CSV data (embed this in the HTML as a JS string):",
    "```csv",
    csvText,
    "```",
    "",
    "USER REQUEST:",
    userPrompt,
  );

  return basePrompt.join("\n");
}

// ---------------------------------------------------------------------------
// Fallback: generate a simple D3 chart from the raw CSV when LLM fails
// ---------------------------------------------------------------------------

function buildFallbackHtml(csvText: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Vizard.ai — D3 Visualization</title>
  <script src="https://d3js.org/d3.v7.min.js"><\/script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #ffffff; color: #334155; display: flex; flex-direction: column; align-items: center; padding: 24px; }
    h2 { font-size: 18px; font-weight: 700; margin-bottom: 16px; color: #1e3a5f; }
    .bar { fill: #0d9488; rx: 4; }
    .bar:hover { fill: #1e3a5f; }
    .axis text { font-size: 11px; fill: #64748b; }
    .axis line, .axis path { stroke: #e2e8f0; }
    .tooltip { position: absolute; background: #1e293b; color: white; padding: 6px 10px; border-radius: 6px; font-size: 12px; pointer-events: none; opacity: 0; transition: opacity 0.2s; }
  </style>
</head>
<body>
  <h2>Auto-Generated D3 Bar Chart</h2>
  <div id="chart"></div>
  <div class="tooltip" id="tooltip"></div>
  <script>
    const csvText = ${JSON.stringify(csvText)};
    const raw = d3.csvParse(csvText);

    // Find first non-numeric and first numeric column
    const cols = raw.columns;
    let xCol = null, yCol = null;
    for (const c of cols) {
      const sample = raw[0]?.[c];
      if (yCol === null && !isNaN(parseFloat(sample))) { yCol = c; }
      else if (xCol === null && isNaN(parseFloat(sample))) { xCol = c; }
    }
    if (!xCol) xCol = cols[0];
    if (!yCol) yCol = cols[1] || cols[0];

    // Aggregate
    const grouped = d3.rollup(raw, v => d3.sum(v, d => +d[yCol] || 0), d => d[xCol]);
    const data = Array.from(grouped, ([key, value]) => ({ x: key, y: value }))
      .sort((a, b) => b.y - a.y)
      .slice(0, 20);

    const margin = { top: 20, right: 20, bottom: 80, left: 60 };
    const width = Math.min(window.innerWidth - 48, 700) - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select("#chart").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", \`translate(\${margin.left},\${margin.top})\`);

    const x = d3.scaleBand().domain(data.map(d => d.x)).range([0, width]).padding(0.2);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.y)]).nice().range([height, 0]);

    svg.append("g").attr("class", "axis").attr("transform", \`translate(0,\${height})\`).call(d3.axisBottom(x))
      .selectAll("text").attr("transform", "rotate(-45)").style("text-anchor", "end");
    svg.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(6));

    const tooltip = d3.select("#tooltip");

    svg.selectAll(".bar").data(data).enter().append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.x))
      .attr("width", x.bandwidth())
      .attr("y", height)
      .attr("height", 0)
      .on("mouseover", (e, d) => { tooltip.style("opacity", 1).html(\`<b>\${d.x}</b>: \${d.y.toLocaleString()}\`); })
      .on("mousemove", (e) => { tooltip.style("left", (e.pageX + 12) + "px").style("top", (e.pageY - 28) + "px"); })
      .on("mouseout", () => { tooltip.style("opacity", 0); })
      .transition().duration(800).ease(d3.easeCubicOut)
      .attr("y", d => y(d.y))
      .attr("height", d => height - y(d.y));

    // Y axis label
    svg.append("text").attr("transform", "rotate(-90)").attr("y", -45).attr("x", -height / 2)
      .attr("text-anchor", "middle").style("font-size", "12px").style("fill", "#64748b").text(yCol);
  <\/script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Main agent runner
// ---------------------------------------------------------------------------

export async function runAgent(input: AgentInput): Promise<AgentResult> {
  const { csvBase64, prompt } = input;
  const csvText = csvBase64ToText(csvBase64);

  let suggestions: VizSuggestion[] | undefined;

  // Step 1: Inspect data via Python service for schema/stats/suggestions
  let schemaPreview = "";
  let samplePreview = "";
  let statsPreview = "";

  try {
    const insight = await inspectData(csvBase64);
    suggestions = insight.suggestions;
    schemaPreview = insight.schema
      .map((f) => `${f.name} (${f.dtype})`)
      .join(", ");
    samplePreview = formatSampleForPrompt(insight.sample ?? []);
    statsPreview = formatStatsForPrompt(insight.stats);
  } catch (err) {
    console.warn("[Vizard] Python inspect failed, using raw CSV headers:", err);
    // Fallback: parse headers from CSV text
    const firstLine = csvText.split("\n")[0] ?? "";
    schemaPreview = firstLine;
    samplePreview = csvText.split("\n").slice(0, 5).join("\n");
    statsPreview = "(unavailable)";
  }

  // Step 2: Determine chart type and select template
  let vizType = "other";
  let templateString: string | null = null;

  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt.includes("globe") || lowerPrompt.includes("map") || lowerPrompt.includes("country") || lowerPrompt.includes("world")) {
    vizType = "globe";
    templateString = GLOBE_TEMPLATE;
  } else if (lowerPrompt.includes("bar") || lowerPrompt.includes("compare")) {
    vizType = "bar";
    templateString = BAR_TEMPLATE;
  } else if (lowerPrompt.includes("scatter") || lowerPrompt.includes("correlation") || lowerPrompt.includes("relationship")) {
    vizType = "scatter";
    templateString = SCATTER_TEMPLATE;
  } else if (lowerPrompt.includes("line") || lowerPrompt.includes("trend") || lowerPrompt.includes("time") || lowerPrompt.includes("year")) {
    vizType = "line";
    templateString = LINE_TEMPLATE;
  } else if (schemaPreview.toLowerCase().includes("country") || schemaPreview.toLowerCase().includes("state")) {
    vizType = "globe";
    templateString = GLOBE_TEMPLATE;
  }

  // Step 3: Ask Gemini to generate D3 HTML using the template
  const llmPrompt = buildD3Prompt(
    prompt,
    schemaPreview,
    samplePreview,
    statsPreview,
    csvText,
    templateString,
    vizType,
  );

  const llmResponse = await callGemini(llmPrompt);

  if (llmResponse) {
    const html = extractHtmlFromResponse(llmResponse);
    if (html) {
      const explanation = extractExplanation(llmResponse);
      return {
        kind: "dynamic",
        html,
        explanation: explanation ?? "D3.js visualization generated by the AI agent.",
        suggestions,
      };
    }
    console.warn("[Vizard] LLM responded but no valid HTML found, using fallback");
  } else {
    console.warn("[Vizard] LLM call failed, using fallback D3 chart");
  }

  // Step 3: Fallback — generate a basic D3 bar chart from the data
  return {
    kind: "dynamic",
    html: buildFallbackHtml(csvText),
    explanation: "The AI agent was unavailable, so a default D3 bar chart was generated from your data.",
    suggestions,
  };
}
