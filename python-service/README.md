# Vizard.ai Python Viz Service

FastAPI backend that powers Vizard.ai's data inspection, cleaning, and static visualization tools.

## Endpoints

- `GET /health` – Simple health check.
- `POST /inspect` – Inspect a CSV (base64) and return schema, sample rows, and basic numeric stats.
- `POST /clean` – Apply a robust default cleaning pipeline and return a cleaned CSV (base64).
- `POST /viz` – Create a static visualization and return a PNG image (base64).

## Running locally

```bash
cd python-service
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The Next.js app is configured (by default) to talk to `http://localhost:8000`.

