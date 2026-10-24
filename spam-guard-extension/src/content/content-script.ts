import { ShapExplanationProvider } from '../explainability/shap-explanation-provider';
import {
  isPredictionResponse,
  type PredictEmailRequest,
  type PredictionResponse,
} from '../shared/messages';
import { type BadgeState, isBadgeRendered, renderBadge } from './badge';
import { extractOpenEmail, findSubjectElement } from './email-extractor';

const SCAN_DEBOUNCE_MS = 400;

const provider = new ShapExplanationProvider();

let debounceTimer: number | undefined;
let activeKey: string | null = null;
let lastState: BadgeState | null = null;

function scheduleScan(): void {
  window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(
    (): void => {
      void scan();
    },
    SCAN_DEBOUNCE_MS,
  );
}

async function scan(): Promise<void> {
  const subjectElement = findSubjectElement(document);
  const email = extractOpenEmail(document);
  if (subjectElement === null || email === null) {
    return;
  }

  const key = `${email.subject}::${email.body}`;

  if (key === activeKey) {
    if (lastState !== null && !isBadgeRendered()) {
      renderBadge(
        subjectElement,
        lastState,
        provider,
      );
    }
    return;
  }

  activeKey = key;
  lastState = null;
  renderBadge(
    subjectElement,
    { kind: 'checking' },
    provider,
  );

  const response = await sendPredictionRequest({
    type: 'PREDICT_EMAIL',
    subject: email.subject,
    body: email.body,
  });

  if (activeKey !== key) {
    return;
  }

  lastState =
    response.type === 'PREDICTION_OK'
      ? { kind: 'verdict', result: response.result, emailBody: email.body }
      : { kind: 'unavailable', reason: response.reason };

  const freshSubject = findSubjectElement(document);
  if (freshSubject !== null) {
    renderBadge(
      freshSubject,
      lastState,
      provider,
    );
  }
}

function sendPredictionRequest(
  request: PredictEmailRequest,
): Promise<PredictionResponse> {
  return new Promise((resolve): void => {
    try {
      chrome.runtime.sendMessage(
        request,
        (response: unknown): void => {
          if (chrome.runtime.lastError !== undefined) {
            resolve({
              type: 'PREDICTION_ERROR',
              reason:
              chrome.runtime.lastError.message ?? 'Extension messaging failed.',
            });
            return;
          }
          resolve(
            isPredictionResponse(response)
              ? response
              : {
                type: 'PREDICTION_ERROR',
                reason: 'Malformed response from service worker.',
              },
          );
        },
      );
    } catch {
      resolve({
        type: 'PREDICTION_ERROR',
        reason: 'Unable to reach the extension service worker.',
      });
    }
  });
}

const observer = new MutationObserver(scheduleScan);
observer.observe(
  document.body,
  { childList: true, subtree: true },
);
scheduleScan();
