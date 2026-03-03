import fs from 'fs';
import path from 'path';
import { MasterAgent, VisualizationSubagent, ValidationSubagent, DataSubagent } from '../src/lib/multi-agent';

// Simple helper to load .env.local
function loadEnv() {
    const envPath = path.join(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach((line: string) => {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim();
            }
        });
    }
}

loadEnv();

async function testSpecWorkflow() {
    console.log("=== Test 1: Spec-Based Workflow (Mock) ===");

    const master = new MasterAgent({ model: "mock" });

    const mockVisualizer = new VisualizationSubagent({ model: "mock" });
    const mockValidator = new ValidationSubagent({ model: "mock" });
    master.registerSubagent("visualizer", mockVisualizer);
    master.registerSubagent("validator", mockValidator);

    const csvPath = path.join(__dirname, '../../test-data/spatial_clean.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const csvBase64 = Buffer.from(csvContent).toString('base64');

    let callCount = 0;
    mockVisualizer.generateSpec = async (p: string, i: any) => {
        callCount++;
        if (callCount > 1) {
            return { viz_type: "scatter_geo", x: "name", y: "latitude", options: { lat: "latitude", lon: "longitude" } };
        }
        return { viz_type: "bar", x: "name", y: "latitude" };
    };

    mockValidator.validate = async (s: any, e: string) => {
        if (s.viz_type === "scatter_geo") return { valid: true };
        return { valid: false, feedback: "Use scatter_geo for maps." };
    };

    const result = await master.runWorkflow(csvBase64, "Show locations on map", "Must use scatter_geo");
    console.log("Result:", JSON.stringify(result, null, 2));

    if (result.attempts > 1) {
        console.log("✅ Spec feedback loop: PASSED\n");
    } else {
        console.error("❌ Spec feedback loop: FAILED\n");
    }
}

async function testD3CodeWorkflow() {
    console.log("=== Test 2: D3 Code Generation Workflow (Mock) ===");

    const master = new MasterAgent({ model: "mock" });

    const mockVisualizer = new VisualizationSubagent({ model: "mock" });
    const mockValidator = new ValidationSubagent({ model: "mock" });
    master.registerSubagent("visualizer", mockVisualizer);
    master.registerSubagent("validator", mockValidator);

    const csvPath = path.join(__dirname, '../../test-data/spatial_clean.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const csvBase64 = Buffer.from(csvContent).toString('base64');

    let codeGenCount = 0;
    mockVisualizer.generateD3Code = async (prompt: string, insight: any, csvData: string, feedback?: string) => {
        codeGenCount++;
        if (codeGenCount === 1) {
            // First attempt: broken (missing D3 import)
            return '<html><body><div id="chart"></div></body></html>';
        }
        // Second attempt: correct
        return `<!DOCTYPE html>
<html><head><script src="https://d3js.org/d3.v7.min.js"></script></head>
<body><svg id="chart"></svg>
<script>
const DATA = [${csvData.split('\n').slice(0, 3).map(r => `"${r}"`).join(',')}];
const svg = d3.select("#chart").attr("width", 800).attr("height", 600);
svg.append("circle").attr("cx", 400).attr("cy", 300).attr("r", 100).attr("fill", "#0d9488");
</script></body></html>`;
    };

    mockValidator.validateD3Code = async (html: string, userPrompt: string) => {
        if (html.includes("d3.v7.min.js") && html.includes("d3.select")) {
            return { valid: true, issues: [], feedback: "" };
        }
        return {
            valid: false,
            issues: ["MISSING_D3_IMPORT"],
            feedback: "Code is missing D3.js CDN import. Add: <script src='https://d3js.org/d3.v7.min.js'></script>"
        };
    };

    const phases: string[] = [];
    const result = await master.runD3CodeWorkflow(
        csvBase64,
        "Show locations on a 3D globe",
        (phase) => phases.push(phase),
    );

    console.log("Phases hit:", phases);
    console.log("Attempts:", result.attempts);
    console.log("HTML length:", result.html.length);
    console.log("Has D3 import:", result.html.includes("d3.v7.min.js"));

    if (result.attempts === 2 && result.html.includes("d3.v7.min.js")) {
        console.log("✅ D3 code generation feedback loop: PASSED\n");
    } else {
        console.error("❌ D3 code generation feedback loop: FAILED\n");
    }
}

async function main() {
    await testSpecWorkflow();
    await testD3CodeWorkflow();
    console.log("All tests complete.");
}

main().catch(console.error);
