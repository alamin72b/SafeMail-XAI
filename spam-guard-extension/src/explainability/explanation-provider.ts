export interface TokenAttribution {
  readonly token: string;
  readonly importance: number;
}

export interface SpamExplanation {
  readonly method: 'placeholder' | 'attention' | 'shap' | 'lime';
  readonly attributions: readonly TokenAttribution[];
  readonly summary: string;
  /** Top spam-pushing tokens, if the provider computes them (e.g. SHAP). */
  readonly topSpam?: readonly TokenAttribution[];
  /** Top ham-pushing tokens, if the provider computes them (e.g. SHAP). */
  readonly topHam?: readonly TokenAttribution[];
  /** True if the email exceeded the model's input window. */
  readonly wasTruncated?: boolean;
  /** Analyst-facing caveat shown alongside the explanation, if any. */
  readonly caveat?: string;
}

export interface ExplanationProvider {
  explain(emailBody: string): Promise<SpamExplanation>;
}

/**
 * The single intentional placeholder in this codebase.
 * Swap this implementation for a real XAI provider (attention / SHAP / LIME)
 * without touching any rendering code.
 */
export class PlaceholderExplanationProvider implements ExplanationProvider {
  public async explain(_emailBody: string): Promise<SpamExplanation> {
    return {
      method: 'placeholder',
      attributions: [],
      summary: 'Explainability will be available in a future release.',
    };
  }
}
