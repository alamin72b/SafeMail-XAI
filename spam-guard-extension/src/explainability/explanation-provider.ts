export interface TokenAttribution {
  readonly token: string;
  readonly importance: number;
}

export interface SpamExplanation {
  readonly method: 'placeholder' | 'attention' | 'shap' | 'lime';
  readonly attributions: readonly TokenAttribution[];
  readonly summary: string;
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
