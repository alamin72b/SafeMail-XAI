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
