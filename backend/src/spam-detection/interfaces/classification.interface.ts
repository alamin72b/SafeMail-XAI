/** Encoded tensors produced by the tokenizer, ready for ONNX Runtime. */
export interface EncodedInput {
  inputIds: BigInt64Array;
  attentionMask: BigInt64Array;
  /** Sequence length after truncation (number of tokens). */
  length: number;
}

/** Full response contract returned by POST /spam-detection/classify. */
export interface ClassificationResponse {
  verdict: 'SPAM' | 'HAM';
  spamProbability: number; // softmax output in [0, 1]
  hamProbability: number; // softmax output in [0, 1]
  logits: [ham: number, spam: number];
  tokenCount: number;
  inferenceTimeMs: number;
  model: {
    name: string;
    quantization: string;
    runtime: string;
  };
  processedAt: string; // ISO-8601 timestamp
}

/** Health endpoint contract. */
export interface HealthResponse {
  status: 'ok' | 'initializing';
  engineReady: boolean;
}

/** A single token's contribution to the spam probability, from SHAP. */
export interface TokenContribution {
  token: string;
  shapValue: number; // positive pushes toward SPAM, negative toward HAM
}

/** Full response contract returned by POST /spam-detection/explain. */
export interface ExplanationResponse {
  verdict: 'SPAM' | 'HAM';
  spamProbability: number;
  baseValue: number; // SHAP base/expected value
  truncatedTokenCount: number; // how many of the 128 tokens were used
  wasTruncated: boolean; // true if the email exceeded 128 tokens
  tokens: TokenContribution[]; // in reading order, only tokens the model saw
  topSpam: TokenContribution[]; // top ~8 most spam-pushing
  topHam: TokenContribution[]; // top ~8 most ham-pushing
  caveat: string;
}
