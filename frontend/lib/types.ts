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
