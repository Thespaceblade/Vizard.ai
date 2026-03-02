# Vizard.ai – setup for partners

Use this guide to get the repo and dependencies in sync so transferring code via GitHub is smooth.

## Prerequisites

- **Node.js** 18+ (LTS recommended). Use the repo’s `.nvmrc` if you use nvm: `nvm use`.
- **Python** 3.10+ and `pip`.
- **Git.**

## 1. Clone and branch

```bash
git clone <repo-url> Vizard.ai
cd Vizard.ai
git checkout main   # or your team’s default branch
git pull
```

## 2. Web app (Next.js)

```bash
cd web
npm ci
npm run dev
```

- App: [http://localhost:3000](http://localhost:3000)
- `npm ci` keeps installs consistent with `package-lock.json` (recommended over `npm install` for parity).

## 3. Python service (FastAPI)

```bash
cd python-service
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

- API: [http://localhost:8000](http://localhost:8000)
- The Next.js app expects this service at `http://localhost:8000` by default.

## 4. After pulling new code

- **Web:** From repo root, `cd web && npm ci` (and `npm run dev` if you run it locally).
- **Python:** From repo root, `cd python-service`, activate your venv, then `pip install -r requirements.txt`.

## 5. Dependencies and GitHub

- **Web:** Dependencies are in `web/package.json` and `web/package-lock.json`. Commit the lockfile so everyone gets the same versions.
- **Python:** Dependencies are in `python-service/requirements.txt`. Pin versions there if you need exact reproducibility (e.g. `fastapi==0.115.0`).

## Folder layout

```
Vizard.ai/
├── .cursor/           # Cursor rules and change log (see below)
├── docs/              # Project docs (this file)
├── web/               # Next.js app
│   ├── package.json
│   ├── package-lock.json
│   └── src/
├── python-service/    # FastAPI backend
│   ├── requirements.txt
│   ├── main.py
│   └── tools.py
├── .gitignore
├── .nvmrc             # Node version hint (nvm use)
└── README.md
```

## Commits and `.cursor/CHANGES.md`

- Automated edits are summarized in `.cursor/CHANGES.md`.
- Commits and pushes should use that file to write **conventional** commit messages (`feat:`, `fix:`, `docs:`, `chore:`, etc.) so history stays clear and consistent across the team.
