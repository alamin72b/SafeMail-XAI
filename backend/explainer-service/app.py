"""SHAP-based explainability microservice for the SafeMail-XAI spam classifier.

Loads the SAME ONNX model and equivalent tokenizer as the NestJS backend
(backend/src/spam-detection/spam-detection.service.ts) so spam probabilities
match exactly, then uses SHAP's Partition text explainer to attribute the
model's spam probability to individual tokens.

This is decision support for a human analyst, not a replacement for their
judgment -- see the caveat returned in every response.
"""

import hashlib
import logging
import os
from pathlib import Path
from typing import List

import numpy as np
import onnxruntime as ort
import shap
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from transformers import AutoTokenizer

logger = logging.getLogger("explainer-service")
logging.basicConfig(level=logging.INFO)

MAX_SEQUENCE_LENGTH = 128
SPAM_INDEX = 1
HAM_INDEX = 0
SPAM_THRESHOLD = 0.5
TOP_K = 8
CAVEAT = (
    "Estimated word contributions — decision support, not proof. "
    "The analyst makes the final call."
)

DEFAULT_MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "model.onnx"
MODEL_PATH = Path(os.environ.get("MODEL_PATH", str(DEFAULT_MODEL_PATH)))
TOKENIZER_ID = os.environ.get("TOKENIZER_ID", "xlm-roberta-base")

# Special tokens are part of what the model saw, but they aren't meaningful
# "words" for an analyst to read -- they're excluded from the highlighted
# token list and top-signals lists, though they DO stay in the sum used to
# sanity-check SHAP's additivity property in the e2e test.
_SPECIAL_TOKEN_MARKERS = {"<s>", "</s>", "<pad>", "<unk>", "<mask>"}


class ExplainRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=100_000)


class TokenContribution(BaseModel):
    token: str
    shapValue: float


class ExplainResponse(BaseModel):
    verdict: str
    spamProbability: float
    baseValue: float
    truncatedTokenCount: int
    wasTruncated: bool
    tokens: List[TokenContribution]
    topSpam: List[TokenContribution]
    topHam: List[TokenContribution]
    caveat: str = CAVEAT


class ModelBundle:
    """Holds the loaded ONNX session, tokenizer, and SHAP explainer."""

    def __init__(self) -> None:
        if not MODEL_PATH.exists():
            raise RuntimeError(f"ONNX model not found at: {MODEL_PATH}")

        logger.info("Loading ONNX model from %s", MODEL_PATH)
        self.session = ort.InferenceSession(
            str(MODEL_PATH),
            providers=["CPUExecutionProvider"],
        )

        logger.info("Loading tokenizer: %s", TOKENIZER_ID)
        self.tokenizer = AutoTokenizer.from_pretrained(TOKENIZER_ID)

        self.masker = shap.maskers.Text(self.tokenizer)
        self.explainer = shap.Explainer(self.predict_spam_proba, self.masker)

        logger.info("Explainer service ready.")

    def predict_spam_proba(self, texts: List[str]) -> np.ndarray:
        """f(list_of_texts) -> np.array of SPAM probabilities.

        Tokenizes each text independently to a fixed [1, 128] shape (matching
        the backend's inference exactly) and runs the ONNX model one text at
        a time, since the exported graph expects a fixed batch size of 1.
        """
        probabilities = np.empty(len(texts), dtype=np.float64)
        for i, text in enumerate(texts):
            encoded = self.tokenizer(
                text,
                truncation=True,
                max_length=MAX_SEQUENCE_LENGTH,
                padding="max_length",
                return_tensors="np",
            )
            input_ids = encoded["input_ids"].astype(np.int64)
            attention_mask = encoded["attention_mask"].astype(np.int64)

            outputs = self.session.run(
                None,
                {"input_ids": input_ids, "attention_mask": attention_mask},
            )
            logits = outputs[0][0]
            probabilities[i] = _softmax(logits)[SPAM_INDEX]
        return probabilities

    def encode_truncated(self, text: str) -> dict:
        return self.tokenizer(
            text,
            truncation=True,
            max_length=MAX_SEQUENCE_LENGTH,
            padding="max_length",
        )

    def total_token_count(self, text: str) -> int:
        return len(self.tokenizer(text, truncation=False)["input_ids"])


def _softmax(logits: np.ndarray) -> np.ndarray:
    shifted = logits - np.max(logits)
    exp = np.exp(shifted)
    return exp / exp.sum()


_cache: dict = {}
_bundle: ModelBundle | None = None

app = FastAPI(title="SafeMail-XAI Explainer Service")


@app.on_event("startup")
def load_model() -> None:
    global _bundle
    _bundle = ModelBundle()


@app.get("/health")
def health() -> dict:
    return {"status": "ok" if _bundle is not None else "initializing"}


@app.post("/explain", response_model=ExplainResponse)
def explain(request: ExplainRequest) -> ExplainResponse:
    if _bundle is None:
        raise HTTPException(status_code=503, detail="Model is not initialized.")

    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text must not be empty.")

    cache_key = hashlib.sha256(text.encode("utf-8")).hexdigest()
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    response = _compute_explanation(text)
    _cache[cache_key] = response
    return response


def _compute_explanation(text: str) -> ExplainResponse:
    bundle = _bundle
    assert bundle is not None

    total_len = bundle.total_token_count(text)
    truncated_encoding = bundle.encode_truncated(text)
    truncated_token_count = sum(truncated_encoding["attention_mask"])
    was_truncated = total_len > truncated_token_count

    spam_probability = float(bundle.predict_spam_proba([text])[0])
    verdict = "SPAM" if spam_probability >= SPAM_THRESHOLD else "HAM"

    shap_values = bundle.explainer([text])
    sv = shap_values[0]

    raw_tokens = list(sv.data)
    raw_values = [float(v) for v in sv.values]
    base_value = float(np.array(sv.base_values).reshape(-1)[0])

    # Best-effort alignment: the masker tokenizes the full (untruncated) text
    # in the same left-to-right order the model's own truncated encoding
    # uses, so the first `truncated_token_count` entries correspond to what
    # the model actually saw. Bounded defensively in case of a mismatch.
    seen_count = min(truncated_token_count, len(raw_tokens))
    seen_tokens = raw_tokens[:seen_count]
    seen_values = raw_values[:seen_count]

    displayed = [
        TokenContribution(token=tok, shapValue=val)
        for tok, val in zip(seen_tokens, seen_values)
        if tok.strip() not in _SPECIAL_TOKEN_MARKERS and tok.strip() != ""
    ]

    top_spam = sorted(
        (t for t in displayed if t.shapValue > 0),
        key=lambda t: t.shapValue,
        reverse=True,
    )[:TOP_K]
    top_ham = sorted(
        (t for t in displayed if t.shapValue < 0),
        key=lambda t: t.shapValue,
    )[:TOP_K]

    return ExplainResponse(
        verdict=verdict,
        spamProbability=spam_probability,
        baseValue=base_value,
        truncatedTokenCount=int(truncated_token_count),
        wasTruncated=was_truncated,
        tokens=displayed,
        topSpam=top_spam,
        topHam=top_ham,
    )
