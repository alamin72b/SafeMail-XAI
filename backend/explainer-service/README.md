# Explainer service

A small FastAPI microservice that computes SHAP-based, token-level
explanations for the spam classifier, using the **same ONNX model and
equivalent tokenizer as the NestJS backend** so probabilities match exactly.

This is decision support for a human analyst reviewing a flagged email — it
is not a replacement for their judgment. Every response carries a caveat
string to that effect.

## Setup

```bash
cd backend/explainer-service
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

## Run

```bash
.venv/bin/uvicorn app:app --host 0.0.0.0 --port 8000
```

## Verify

```bash
.venv/bin/python test_e2e.py
```

Sends a clearly-spam and a clearly-ham email through `/explain` and prints
the verdict, spam probability, and top 5 spam/ham tokens for each, plus a
SHAP additivity check (`sum(token shapValues) + baseValue ≈ spamProbability`)
confirming the explanation is derived from the actual model output.

## API

`POST /explain`

Request:
```json
{ "text": "email body text" }
```

Response:
```json
{
  "verdict": "SPAM",
  "spamProbability": 0.97,
  "baseValue": 0.12,
  "truncatedTokenCount": 84,
  "wasTruncated": false,
  "tokens": [{ "token": "▁free", "shapValue": 0.08 }],
  "topSpam": [{ "token": "▁free", "shapValue": 0.08 }],
  "topHam": [{ "token": "▁meeting", "shapValue": -0.03 }],
  "caveat": "Estimated word contributions — decision support, not proof. The analyst makes the final call."
}
```

Only tokens the model actually saw (the first 128 tokens, per the same fixed
`[1, 128]` input shape the backend uses) are returned. If the email was
longer, `wasTruncated` is `true` so the UI can surface that.

`shapValue > 0` pushes the prediction toward SPAM; `shapValue < 0` pushes it
toward HAM.

### Known limitation: saturated baseline on obvious spam

`baseValue` is the model's output on a fully-masked (all `<mask>` token)
input — this is off-distribution for a transformer fine-tuned on real email
text, and in testing it comes out close to 1.0 (i.e. the model already looks
~99% "spam" on pure `<mask>` noise). For an email that is *already* obvious
spam, this leaves little room for individual spam words to push the
probability up further, so they can show up with small or even
counter-intuitively negative SHAP values, while the "top spam signals" list
ends up dominated by weak, near-zero contributors (often punctuation). This
was verified against `test_e2e.py`: the additivity property still holds
exactly (the math is correct), but the word-level story it tells is weaker
for extreme spam than for extreme ham, where it reads cleanly. This is a
known characteristic of mask-based SHAP text explanations on fine-tuned
transformers, not a bug — it's part of why every response carries the
"decision support, not proof" caveat. Worth revisiting (e.g. a different
masking strategy, or `fixed_context=1`) once real analyst feedback is in.

Results are cached in-memory keyed by a SHA-256 hash of the input text, since
SHAP requires many forward passes per explanation and this is meant to be an
on-demand "Explain this" action, not something called on every scan.

## Environment variables

- `MODEL_PATH` — path to the ONNX model. Defaults to `../models/model.onnx`
  (the same file the NestJS backend loads).
- `TOKENIZER_ID` — tokenizer to load via `transformers.AutoTokenizer`.
  Defaults to `xlm-roberta-base` (the un-quantized counterpart of the
  backend's `Xenova/xlm-roberta-base`; same vocabulary).
