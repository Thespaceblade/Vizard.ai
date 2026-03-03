const fs = require('fs');
const path = require('path');

// Simple helper to load .env.local
function loadEnv() {
    const envPath = path.join(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim();
            }
        });
    }
}

loadEnv();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

async function testGemini() {
    console.log(`Using model: ${GEMINI_MODEL}`);
    if (!GEMINI_API_KEY) {
        console.error("ERROR: GEMINI_API_KEY not found in .env.local");
        process.exit(1);
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: "Respond with 'CONFIG_OK' if you can read this." }] }],
                generationConfig: { temperature: 0.1 }
            }),
        });

        const status = response.status;
        const body = await response.json();

        if (status === 200) {
            const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
            console.log(`Response text: ${text}`);
            if (text && text.includes("CONFIG_OK")) {
                console.log("SUCCESS: Gemini API is working with the new configuration.");
            } else {
                console.log("WARNING: API worked but response was unexpected.");
            }
        } else {
            console.error(`FAILURE: Gemini API returned status ${status}`);
            console.error(JSON.stringify(body, null, 2));
            process.exit(1);
        }
    } catch (error) {
        console.error("ERROR: Failed to make request:", error);
        process.exit(1);
    }
}

testGemini();
