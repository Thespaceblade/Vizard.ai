import { type VizSpec, inspectData, cleanData, type InspectResponse } from "./tools";

export type ModelType = "gemini-2.5-flash" | "gemini-1.5-pro" | "gpt-4o" | "gpt-4o-mini" | "mock";

export interface AgentConfig {
    model: ModelType;
    temperature?: number;
    mockResponse?: string;
}

export interface AgentResponse {
    content: string;
    toolCalls?: Array<{ name: string; args: any }>;
}

export interface D3CodeResult {
    html: string;
    explanation: string;
    attempts: number;
    error?: string;
}

// ---------------------------------------------------------------------------
// Base Agent
// ---------------------------------------------------------------------------

/** Base Agent class to handle different models and communication. */
export abstract class BaseAgent {
    constructor(protected config: AgentConfig) { }

    protected async callModel(prompt: string, systemPrompt?: string): Promise<AgentResponse> {
        if (this.config.model === "mock") {
            return { content: this.config.mockResponse || "Mock response" };
        }

        const apiKey = this.getApiKey();
        if (!apiKey) throw new Error(`Missing API key for model: ${this.config.model}`);

        if (this.config.model.startsWith("gemini")) {
            return this.callGemini(prompt, systemPrompt);
        } else {
            return this.callOpenAI(prompt, systemPrompt);
        }
    }

    private getApiKey(): string | undefined {
        if (this.config.model.startsWith("gemini")) return process.env.GEMINI_API_KEY;
        return process.env.OPENAI_API_KEY;
    }

    private async callGemini(prompt: string, systemPrompt?: string): Promise<AgentResponse> {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
        const body: any = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: this.config.temperature ?? 0.3, maxOutputTokens: 8192 },
        };
        if (systemPrompt) {
            body.systemInstruction = { parts: [{ text: systemPrompt }] };
        }

        const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!res.ok) throw new Error(`Gemini error: ${res.status} ${await res.text()}`);
        const data = await res.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        return { content };
    }

    private async callOpenAI(prompt: string, systemPrompt?: string): Promise<AgentResponse> {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: this.config.model,
                messages: [
                    ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
                    { role: "user", content: prompt },
                ],
                temperature: this.config.temperature ?? 0.3,
                max_tokens: 8192,
            }),
        });

        if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${await res.text()}`);
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || "";
        return { content };
    }
}

// ---------------------------------------------------------------------------
// D3 Code Generation System Prompt
// ---------------------------------------------------------------------------

const D3_CODE_GEN_SYSTEM_PROMPT = `You are an expert D3.js developer and data visualization engineer for Vizard.ai.
Your task is to write a COMPLETE, SELF-CONTAINED HTML document that renders a beautiful, interactive data visualization using D3.js.

CRITICAL RULES:
1. Output ONLY the HTML document. No markdown, no explanation, no code fences. Just raw HTML starting with <!DOCTYPE html>.
2. Use D3.js v7 loaded from CDN: <script src="https://d3js.org/d3.v7.min.js"></script>
3. For globe/geo visualizations, also load: <script src="https://d3js.org/topojson.v3.min.js"></script> and fetch world data from: https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json
4. The data will be embedded directly in the HTML as a JavaScript variable called DATA.
5. The visualization MUST fill the entire viewport (width: 100%, height: 100vh).
6. Use a clean white background with the Vizard.ai color palette:
   - Deep blue: #1e3a5f
   - Teal: #0d9488
   - Orange: #f97316
   - Slate: #475569
   - Blue: #1d4ed8
7. Add smooth transitions and hover effects for interactivity.
8. Include a title in the visualization based on what the data represents.
9. Handle edge cases: empty data, missing values, non-numeric strings.
10. The HTML must be completely self-contained — no external dependencies except D3.js CDN.

VISUALIZATION CAPABILITIES:
- Bar charts, line charts, scatter plots, histograms
- 3D-like globe with orthographic projection (for spatial data with lat/lon)
- Choropleth maps (for country/state data)
- Force-directed network graphs
- Treemaps, sunbursts, packed circles
- Animated time series with play/pause controls
- Any other D3.js visualization the user requests

For globe visualizations specifically:
- Use d3.geoOrthographic() projection
- Add drag-to-rotate interaction with d3.drag()
- Plot data points as circles on the globe surface
- Add graticule lines and country borders
- Animate rotation by default with a slow spin`;

// ---------------------------------------------------------------------------
// Visualization Subagent (D3 Code Generator)
// ---------------------------------------------------------------------------

/** Specialized Agent for generating custom D3.js visualization code. */
export class VisualizationSubagent extends BaseAgent {
    /** Legacy: generate a VizSpec JSON. */
    async generateSpec(prompt: string, insight: any): Promise<VizSpec> {
        const systemPrompt = "You are a data visualization expert. Respond ONLY with a JSON VizSpec.";
        const userPrompt = `Dataset insight: ${JSON.stringify(insight)}\nUser request: ${prompt}`;
        const response = await this.callModel(userPrompt, systemPrompt);
        return JSON.parse(response.content.match(/\{[\s\S]*\}/)?.[0] || "{}");
    }

    /** Generate complete D3.js HTML for a visualization. */
    async generateD3Code(
        prompt: string,
        insight: InspectResponse,
        csvData: string,
        previousFeedback?: string,
    ): Promise<string> {
        const schemaDesc = insight.schema
            .map((f) => `${f.name} (${f.dtype}, ${f.unique} unique, ${f.non_null} non-null)`)
            .join("\n  ");

        const sampleRows = (insight.sample ?? []).slice(0, 5);
        const samplePreview = sampleRows.length > 0
            ? JSON.stringify(sampleRows, null, 2)
            : "(no sample data)";

        const statsDesc = Object.entries(insight.stats ?? {})
            .map(([col, s]) => {
                const parts = [];
                if (s.mean != null) parts.push(`mean=${s.mean.toFixed(2)}`);
                if (s.min != null) parts.push(`min=${s.min}`);
                if (s.max != null) parts.push(`max=${s.max}`);
                return `  ${col}: ${parts.join(", ")}`;
            })
            .join("\n");

        let userPrompt = `Create a D3.js visualization for this dataset.

DATASET SCHEMA:
  ${schemaDesc}

SAMPLE DATA (first 5 rows):
${samplePreview}

NUMERIC STATS:
${statsDesc || "(none)"}

RAW CSV DATA (embed this in the HTML as a JS variable):
${csvData}

USER REQUEST: ${prompt}`;

        if (previousFeedback) {
            userPrompt += `\n\nPREVIOUS ATTEMPT FEEDBACK (fix these issues):\n${previousFeedback}`;
        }

        const response = await this.callModel(userPrompt, D3_CODE_GEN_SYSTEM_PROMPT);
        return this.extractHtml(response.content);
    }

    /** Extract HTML from model output, stripping any markdown fences. */
    private extractHtml(raw: string): string {
        // Strip markdown code fences if present
        let html = raw.trim();
        if (html.startsWith("```")) {
            html = html.replace(/^```(?:html)?\s*\n?/, "").replace(/\n?```\s*$/, "");
        }
        // Ensure it starts with valid HTML
        if (!html.startsWith("<!DOCTYPE") && !html.startsWith("<html") && !html.startsWith("<")) {
            // Try to find HTML within the response
            const htmlMatch = html.match(/<!DOCTYPE[\s\S]*<\/html>/i)
                || html.match(/<html[\s\S]*<\/html>/i);
            if (htmlMatch) html = htmlMatch[0];
        }
        return html.trim();
    }
}

// ---------------------------------------------------------------------------
// Validation Subagent (Code Critic)
// ---------------------------------------------------------------------------

const CODE_VALIDATION_SYSTEM_PROMPT = `You are a D3.js code reviewer for Vizard.ai. Analyze the generated HTML/D3.js code and determine if it will render correctly.

Check for these issues:
1. MISSING_D3_IMPORT: Does it load D3.js from CDN?
2. MISSING_DATA: Is the CSV data properly embedded as a JavaScript variable?
3. BROKEN_SELECTORS: Are D3 selections targeting elements that exist?
4. BAD_SCALES: Are scale domains/ranges set correctly for the data?
5. EMPTY_VIZ: Would this render nothing visible (e.g. zero-height SVG)?
6. WRONG_VIZ_TYPE: Does the visualization match what the user requested?
7. SYNTAX_ERROR: Any obvious JavaScript syntax errors?
8. NO_INTERACTIVITY: User asked for interactivity but code has none?

Respond with EXACTLY this JSON format:
{
  "valid": true/false,
  "issues": ["issue1", "issue2"],
  "feedback": "Detailed instructions on what to fix"
}

If the code looks correct and matches the user's request, respond with:
{ "valid": true, "issues": [], "feedback": "" }`;

/** Specialized Agent for validating generated D3.js code. */
export class ValidationSubagent extends BaseAgent {
    /** Legacy: validate a VizSpec. */
    async validate(spec: VizSpec, expectation: string): Promise<{ valid: boolean; feedback?: string }> {
        const systemPrompt = "Compare the generated VizSpec against the expectation. If it fails, provide detailed feedback on what to fix.";
        const userPrompt = `Spec: ${JSON.stringify(spec)}\nExpectation: ${expectation}`;
        const response = await this.callModel(userPrompt, systemPrompt);
        const isValid = response.content.toLowerCase().includes("valid") && !response.content.toLowerCase().includes("invalid");
        return { valid: isValid, feedback: response.content };
    }

    /** Validate generated D3.js HTML code. */
    async validateD3Code(
        html: string,
        userPrompt: string,
    ): Promise<{ valid: boolean; issues: string[]; feedback: string }> {
        // Quick structural checks before calling LLM
        const structuralIssues: string[] = [];

        if (!html.includes("d3.") && !html.includes("d3.v7")) {
            structuralIssues.push("MISSING_D3_IMPORT: No D3.js reference found in the code");
        }
        if (!html.includes("<svg") && !html.includes("<canvas") && !html.includes("d3.select")) {
            structuralIssues.push("EMPTY_VIZ: No SVG, canvas, or D3 selection found — nothing will render");
        }
        if (!html.includes("DATA") && !html.includes("data") && !html.includes("d3.csv")) {
            structuralIssues.push("MISSING_DATA: No data variable or data loading found");
        }

        // If structural checks catch obvious problems, return early without burning an LLM call
        if (structuralIssues.length > 0) {
            return {
                valid: false,
                issues: structuralIssues,
                feedback: `Structural issues found:\n${structuralIssues.join("\n")}\n\nFix these before proceeding.`,
            };
        }

        // LLM-based deep validation
        const prompt = `User requested: "${userPrompt}"

Generated HTML/D3.js code (first 4000 chars):
${html.slice(0, 4000)}

Validate this code.`;

        const response = await this.callModel(prompt, CODE_VALIDATION_SYSTEM_PROMPT);

        try {
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    valid: Boolean(parsed.valid),
                    issues: Array.isArray(parsed.issues) ? parsed.issues : [],
                    feedback: parsed.feedback || "",
                };
            }
        } catch {
            // If we can't parse the validation response, assume the code is OK
        }

        return { valid: true, issues: [], feedback: "" };
    }
}

// ---------------------------------------------------------------------------
// Data Subagent
// ---------------------------------------------------------------------------

/** Specialized Agent for data inspection and cleaning. */
export class DataSubagent extends BaseAgent {
    async inspect(csvBase64: string): Promise<InspectResponse> {
        return inspectData(csvBase64);
    }

    async suggestCleaning(insight: any): Promise<string | null> {
        const systemPrompt = "Suggest cleaning steps for this dataset. Respond with instructions like 'drop duplicates' or 'drop nulls'.";
        const response = await this.callModel(JSON.stringify(insight), systemPrompt);
        return response.content;
    }

    async clean(csvBase64: string, instructions: string): Promise<string> {
        const result = await cleanData(csvBase64, instructions);
        return result.csv_base64;
    }
}

// ---------------------------------------------------------------------------
// Master Agent (Orchestrator)
// ---------------------------------------------------------------------------

/** Master Agent that orchestrates the subagents with a D3 code generation feedback loop. */
export class MasterAgent extends BaseAgent {
    private subagents: Map<string, BaseAgent> = new Map();

    constructor(config: AgentConfig) {
        super(config);
        this.registerSubagent("visualizer", new VisualizationSubagent({ model: "gemini-2.5-flash", temperature: 0.4 }));
        this.registerSubagent("validator", new ValidationSubagent({ model: "gemini-2.5-flash", temperature: 0.1 }));
        this.registerSubagent("data", new DataSubagent({ model: "gemini-2.5-flash" }));
    }

    registerSubagent(name: string, agent: BaseAgent) {
        this.subagents.set(name, agent);
    }

    getSubagent<T extends BaseAgent>(name: string): T {
        const agent = this.subagents.get(name);
        if (!agent) throw new Error(`Subagent ${name} not found`);
        return agent as T;
    }

    setMockResponses(vizResponse: string, valResponse: string) {
        const viz = this.getSubagent<VisualizationSubagent>("visualizer");
        const val = this.getSubagent<ValidationSubagent>("validator");
        (viz as any).config.mockResponse = vizResponse;
        (val as any).config.mockResponse = valResponse;
    }

    /** Legacy: spec-based workflow. */
    async runWorkflow(csvBase64: string, prompt: string, expectation: string, maxRetries = 3) {
        const dataAgent = this.getSubagent<DataSubagent>("data");
        const visualizer = this.getSubagent<VisualizationSubagent>("visualizer");
        const validator = this.getSubagent<ValidationSubagent>("validator");

        const insight = await dataAgent.inspect(csvBase64);
        let currentSpec = await visualizer.generateSpec(prompt, insight);

        for (let i = 0; i < maxRetries; i++) {
            const { valid, feedback } = await validator.validate(currentSpec, expectation);
            if (valid) return { spec: currentSpec, attempts: i + 1 };

            console.log(`[MasterAgent] Attempt ${i + 1} failed. Feedback: ${feedback}`);
            currentSpec = await visualizer.generateSpec(`${prompt}\nFeedback: ${feedback}`, insight);
        }

        return { spec: currentSpec, attempts: maxRetries, error: "Max retries reached" };
    }

    /**
     * D3 code generation workflow with feedback loop.
     * The model writes complete D3.js HTML. The validator checks it.
     * On failure, feedback is fed back to the visualizer for correction.
     */
    async runD3CodeWorkflow(
        csvBase64: string,
        prompt: string,
        onPhase?: (phase: string) => void,
        maxRetries = 3,
    ): Promise<D3CodeResult> {
        const dataAgent = this.getSubagent<DataSubagent>("data");
        const visualizer = this.getSubagent<VisualizationSubagent>("visualizer");
        const validator = this.getSubagent<ValidationSubagent>("validator");

        // Phase 1: Inspect data
        onPhase?.("inspect");
        const insight = await dataAgent.inspect(csvBase64);

        // Decode CSV for embedding in the generated HTML
        const csvText = Buffer.from(csvBase64, "base64").toString("utf-8");

        // Phase 2: Generate D3 code
        onPhase?.("plan");
        let html = await visualizer.generateD3Code(prompt, insight, csvText);
        let explanation = `Custom D3.js visualization generated for: "${prompt}"`;

        for (let i = 0; i < maxRetries; i++) {
            // Phase 3: Validate
            onPhase?.("clean"); // reuse "clean" phase for validation step
            const validation = await validator.validateD3Code(html, prompt);

            if (validation.valid) {
                return { html, explanation, attempts: i + 1 };
            }

            console.log(`[MasterAgent] D3 code attempt ${i + 1} failed. Issues: ${validation.issues.join(", ")}`);
            console.log(`[MasterAgent] Feedback: ${validation.feedback}`);

            // Phase 4: Re-generate with feedback
            onPhase?.("render");
            html = await visualizer.generateD3Code(prompt, insight, csvText, validation.feedback);
        }

        // Return last attempt even if validation never passed
        return { html, explanation, attempts: maxRetries, error: "Max validation retries reached" };
    }
}
