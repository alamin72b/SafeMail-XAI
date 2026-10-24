# SafeMail-XAI

## Explainability (SHAP)

A Python microservice (`backend/explainer-service/`) computes SHAP-based,
token-level explanations for the spam classifier — which words pushed the
model toward SPAM (red) or HAM (green) — for a human analyst reviewing a
flagged email. This is decision support, not a replacement for the
analyst's judgment.

Run it alongside the backend and frontend:

```bash
cd backend/explainer-service
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app:app --host 0.0.0.0 --port 8000
```

The NestJS backend proxies to it at `POST /api/v1/spam-detection/explain`,
using the `EXPLAINER_SERVICE_URL` environment variable (default
`http://localhost:8000`) to find it. See
`backend/explainer-service/README.md` for the full API contract, the
end-to-end verification test, and a known limitation of the SHAP baseline
on obvious spam.
# SafeMail_XAI
