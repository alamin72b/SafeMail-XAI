export interface ClassifyRequest {
  body: string;
}

export interface ClassificationResponse {
  verdict: 'SPAM' | 'HAM';
  spamProbability: number;
  hamProbability: number;
  logits: [number, number];
  tokenCount: number;
  inferenceTimeMs: number;
  model: {
    name: string;
    quantization: string;
    runtime: string;
  };
  processedAt: string;
}

export interface ExplainRequest {
  body: string;
}

export interface TokenContribution {
  token: string;
  shapValue: number; // positive pushes toward SPAM, negative toward HAM
}

export interface ExplanationResponse {
  verdict: 'SPAM' | 'HAM';
  spamProbability: number;
  baseValue: number;
  truncatedTokenCount: number;
  wasTruncated: boolean;
  tokens: TokenContribution[];
  topSpam: TokenContribution[];
  topHam: TokenContribution[];
  caveat: string;
}
