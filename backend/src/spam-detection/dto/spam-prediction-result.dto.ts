export interface SpamPredictionResultDto {
  isSpam: boolean;
  label: 'spam' | 'ham';
  spamProbability: number;
  hamProbability: number;
  threshold: number;
  tokenCount?: number;
}
