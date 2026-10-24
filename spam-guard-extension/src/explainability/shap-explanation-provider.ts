import {
  type ExplainEmailRequest,
  isExplanationMessageResponse,
} from '../shared/messages';
import type { BackendTokenContribution } from '../shared/types';
import type {
  ExplanationProvider,
  SpamExplanation,
  TokenAttribution,
} from './explanation-provider';

const DEFAULT_CAVEAT =
  'Estimated word contributions — decision support, not proof. ' +
  'The analyst makes the final call.';

/**
 * Requests a SHAP explanation (POST /spam-detection/explain) via the
 * background service worker and adapts the response into the extension's
 * ExplanationProvider shape.
 *
 * The actual fetch runs in the background service worker, not here --
 * Chrome MV3 popups are torn down as soon as they lose focus, which would
 * abort an in-flight fetch made directly from popup script. Routing through
 * the background (which also caches the result by content hash) means a
 * popup close mid-request doesn't lose the work: the next "Explain this"
 * click for the same email resolves instantly from cache.
 *
 * Used only after an explicit user click from the popup or live Gmail badge;
 * SHAP is intentionally never run during automatic email scanning.
 */
export class ShapExplanationProvider implements ExplanationProvider {
  public async explain(emailBody: string): Promise<SpamExplanation> {
    if (emailBody.trim().length === 0) {
      return this.failure('No email body is available to explain.');
    }

    const request: ExplainEmailRequest = {
      type: 'EXPLAIN_EMAIL',
      body: emailBody,
    };

    let response: unknown;
    try {
      response = await chrome.runtime.sendMessage(request);
    } catch {
      return this.failure('Unable to reach the extension background.');
    }

    if (!isExplanationMessageResponse(response)) {
      return this.failure(
        'Explanation service returned a malformed payload.',
      );
    }
    if (response.type === 'EXPLANATION_ERROR') {
      return this.failure(response.reason);
    }

    const payload = response.result;
    const maxAbsShapValue = payload.tokens.reduce(
      (max, token) => Math.max(
        max,
        Math.abs(token.shapValue),
      ),
      1e-6,
    );
    const toAttribution = (
      tokens: readonly BackendTokenContribution[],
    ): TokenAttribution[] =>
      tokens.map((token) => ({
        token: token.token,
        importance: token.shapValue / maxAbsShapValue,
      }));

    return {
      method: 'shap',
      attributions: toAttribution(payload.tokens),
      summary:
        `Verdict: ${payload.verdict} ` +
        `(spam probability ${(payload.spamProbability * 100).toFixed(1)}%)`,
      topSpam: toAttribution(payload.topSpam),
      topHam: toAttribution(payload.topHam),
      wasTruncated: payload.wasTruncated,
      caveat: payload.caveat ?? DEFAULT_CAVEAT,
    };
  }

  private failure(reason: string): SpamExplanation {
    return { method: 'shap', attributions: [], summary: reason };
  }
}
