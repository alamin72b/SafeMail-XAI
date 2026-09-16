"""End-to-end sanity check for the explainer service.

Sends one clearly-spam and one clearly-ham email through /explain and prints
the verdict, spam probability, and top 5 spam/ham tokens for each, so a human
can eyeball whether the highlighted words make intuitive sense. Also asserts
SHAP's additivity property: sum(all token shapValues) + baseValue should
approximately equal spamProbability, confirming the explanation is derived
from the actual deployed model's output rather than a proxy.

Run from backend/explainer-service/ with the venv active:
    .venv/bin/python test_e2e.py
"""

import numpy as np
from fastapi.testclient import TestClient

import app as service

SPAM_TEXT = (
    "CONGRATULATIONS!!! You have WON a $1,000,000 CASH PRIZE! "
    "Click here now to claim your FREE reward before it expires. "
    "Send your bank account and password immediately to verify your winnings. "
    "Act now, limited time offer, 100% guaranteed, no risk!!!"
)

HAM_TEXT = (
    "Hi team, attaching the quarterly report we discussed in yesterday's "
    "meeting. Let me know if the numbers on page 3 look correct before I "
    "send it to finance. Thanks, see you at the standup tomorrow."
)

TOLERANCE = 0.05


def additivity_check(text: str) -> float:
    """Recompute raw SHAP values directly (bypassing the API response's
    truncated/filtered token list) to verify sum(values) + base ≈ f(text)."""
    bundle = service._bundle
    shap_values = bundle.explainer([text])
    sv = shap_values[0]
    total = float(np.sum(sv.values)) + float(np.array(sv.base_values).reshape(-1)[0])
    return total


def run_case(client: TestClient, label: str, text: str) -> None:
    print(f"\n=== {label} ===")
    response = client.post("/explain", json={"text": text})
    response.raise_for_status()
    body = response.json()

    print(f"verdict: {body['verdict']}")
    print(f"spamProbability: {body['spamProbability']:.4f}")
    print(f"baseValue: {body['baseValue']:.4f}")
    print(f"truncatedTokenCount: {body['truncatedTokenCount']}")
    print(f"wasTruncated: {body['wasTruncated']}")

    top_spam = sorted(body["tokens"], key=lambda t: t["shapValue"], reverse=True)[:5]
    top_ham = sorted(body["tokens"], key=lambda t: t["shapValue"])[:5]
    print("top 5 spam-pushing tokens:", [(t["token"], round(t["shapValue"], 4)) for t in top_spam])
    print("top 5 ham-pushing tokens: ", [(t["token"], round(t["shapValue"], 4)) for t in top_ham])

    reconstructed = additivity_check(text)
    diff = abs(reconstructed - body["spamProbability"])
    print(
        f"additivity check: sum(shapValues) + base = {reconstructed:.4f} "
        f"vs spamProbability = {body['spamProbability']:.4f} (diff={diff:.4f})"
    )
    assert diff < TOLERANCE, (
        f"SHAP additivity check failed for {label}: diff {diff:.4f} exceeds "
        f"tolerance {TOLERANCE}. The explanation may not reflect the actual "
        f"model output."
    )


def main() -> None:
    with TestClient(service.app) as client:
        run_case(client, "clearly SPAM email", SPAM_TEXT)
        run_case(client, "clearly HAM email", HAM_TEXT)
    print("\nAll checks passed.")


if __name__ == "__main__":
    main()
