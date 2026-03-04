# Changes Log

> **FOR ALL AGENTIC IDEs (Cursor, Windsurf, Roo/Cline, Gemini):**
> This file (`IDE/CHANGES.md`) is the SINGLE SOURCE OF TRUTH for logging automated edits.
> After making **any** automated change to the codebase, you MUST update this file.
> 1. Start a new section with the current date: `## YYYY-MM-DD: [Brief Title]`
> 2. Add short bullet points summarizing the changes in past tense.
> 3. Use this file as the basis for writing [Conventional Commits](https://www.conventionalcommits.org/).

## 2025-03-02: Initial Project Setup and Vercel Config

- Added `web/vercel.json` and Vercel deployment notes in `web/README.md` (root directory, env vars).
- Added `.cursor/CHANGES.md` and Cursor rules to log automated changes.
- Added root `.gitignore` for OS, env, Python, and Node artifacts.
- Created `docs/SETUP.md` for partner onboarding (clone, deps, run web + python-service).
- Updated root `README.md` with quick start and repo structure.
- Added `.nvmrc` (Node 20) for consistent Node version across machines.

---

## 2026-03-04: SaaS Analytics Dashboard Redesign (Glassmorphism)

### Glassmorphism UI Pivot
- **globals.css**: Replaced claymorphism with glassmorphism tokens (frosted glass, Inter/Nunito font, indigo/green/purple palette)
- **Header.tsx**: Clean frosted glass bar with simplified navigation.
- **page.tsx**: Refocused on the AI Playground data visualization interface. Removed generic SaaS sections (Pricing, Watch Demo, Stats), kept the Glassmorphism Hero with animated SVG charts and the Features grid.
- **AI Playground**: Re-integrated the `VisualizationDisplay` and form into the glassmorphism layout, making it the central feature of the page.
- **types.ts**: Extracted `AgentResult` and `VizSuggestion` into a shared types file.

## 2026-03-04: LearnHub-Inspired Landing Page Redesign


### 🎨 Design System & Branding
- **Logo Zoom**: Increased logo scale to 2.5x and zoomed to 90% (100px) within "perfect square" containers (`rounded-2xl`).
- **Brand Colors**: Extracted primary colors from the Vizard logo (Cyan, Teal, Yellow) and updated `globals.css` design tokens.
- **Claymorphism**: Reinforced the "playful clay" aesthetic with 4px borders and 8px shadows.

### ⚡️ Hero Section
- **Dashboard Overhaul**: Replaced the simple bar chart with a high-fidelity "Agent Intelligence" visual demonstrating the Data → D3 workflow (Analyzer, Coder, Renderer).
- **CTA Updates**: Refined the primary call-to-action to "Start Visualizing" with improved typography.

### 📖 Content & Navigation
- **Documentation**: Created a new `/docs` page with technical engine details and data guides.
- **Footer Cleanup**: Removed "API Keys" link and updated navigation to prioritize Playground and Documentation.

### ⚙️ Infrastructure
- **Build Verification**: Confirmed production build success (`npm run build`).
- **Service Audit**: Verified that both the Next.js frontend and Python backend are running correctly on localhost.

---

## Technical Debts & Reversions
- **Viewport Scaling**: Temporarily implemented and then reverted fluid typography (`clamp()`) and height-based scaling to maintain the original static layout as requested.
- **Accessibility**: Reverted ARIA labels and focus-navigation enhancements to maintain the previous codebase state.
