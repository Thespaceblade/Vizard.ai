# Vizard.ai

An abstracted Data Visualization platform.

## Quick start

- **New to the repo or a project partner?** See **[docs/SETUP.md](docs/SETUP.md)** for clone, dependencies, and running the web app and Python service.
- **Web app:** `cd web && npm ci && npm run dev` → [http://localhost:3000](http://localhost:3000)
- **Python API:** `cd python-service && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && uvicorn main:app --reload --port 8000` → [http://localhost:8000](http://localhost:8000)

## Repo structure

| Path              | Purpose                               |
|-------------------|---------------------------------------|
| `web/`            | Next.js frontend                      |
| `python-service/` | FastAPI backend (viz, inspect, clean) |
| `docs/`           | Setup and project docs                |
| `.cursor/`        | Cursor rules and change log for commits |
| `test-data/`      | CSV datasets for visualization tests  |

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (feat., fix., docs., chore., etc.); see `.cursor/CHANGES.md` and `docs/SETUP.md`.

## Test data

This repository includes a `test-data/` folder containing small CSV datasets for exercising the visualization engine with both clean and messy inputs.

- **Mixed, spatial + categorical + numeric**: `retail_store_sales_*.csv`, `city_incidents_*.csv`, `real_estate_listings_*.csv`
- **Spatial only**: `spatial_*.csv`
- **Categorical only**: `categorical_*.csv`
- **Numeric only**: `numeric_*.csv`
- **Time series**: `time_series_*.csv`
- **Hierarchical**: `hierarchical_*.csv`
- **Network/graph**: `network_*.csv`
- **Text**: `text_*.csv`

Each pair has a `_clean` and `_dirty` version so you can test how well the system handles real-world data quality issues.
