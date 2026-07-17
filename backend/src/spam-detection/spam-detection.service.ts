import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import * as ort from 'onnxruntime-node';
import { AutoTokenizer, PreTrainedTokenizer, env } from '@xenova/transformers';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { ClassifyEmailDto } from './dto/classify-email.dto';
import { SpamPredictionResultDto } from './dto/spam-prediction-result.dto';

@Injectable()
export class SpamDetectionService implements OnModuleInit {
  private readonly logger = new Logger(SpamDetectionService.name);

  // ALIGNED WITH COLAB: Ham is index 0, Spam is index 1.
  private static readonly HAM_INDEX = 0;
  private static readonly SPAM_INDEX = 1;

  private static readonly SPAM_THRESHOLD = 0.5;
  private static readonly MAX_SEQUENCE_LENGTH = 128;

  private session: ort.InferenceSession | null = null;
  private tokenizer: PreTrainedTokenizer | null = null;

  async onModuleInit(): Promise<void> {
    const modelPath = this.resolveModelPath();

    // NOTE: Set this environment variable to the directory of your fine-tuned tokenizer
    // to match the specific vocabulary generated during training.
    const tokenizerId = process.env.TOKENIZER_ID ?? 'Xenova/xlm-roberta-base';

    env.cacheDir =
      process.env.TOKENIZER_CACHE_DIR ??
      path.resolve(process.cwd(), '.tokenizer-cache');
    env.allowLocalModels = true;

    this.logger.log(`Loading ONNX model from: ${modelPath}`);
    this.session = await ort.InferenceSession.create(modelPath, {
      executionProviders: ['cpu'],
      graphOptimizationLevel: 'all',
      intraOpNumThreads: Math.min(4, os.cpus().length),
      enableCpuMemArena: true,
    });

    this.logger.log(`Loading tokenizer: ${tokenizerId}`);
    this.tokenizer = await AutoTokenizer.from_pretrained(tokenizerId);

    this.logger.log('Spam detection service initialized.');
  }

  async classify(dto: ClassifyEmailDto): Promise<SpamPredictionResultDto> {
    if (this.session === null || this.tokenizer === null) {
      throw new InternalServerErrorException(
        'Spam detection model is not initialized.',
      );
    }

    const encoded = await this.tokenizer(dto.body, {
      truncation: true,
      max_length: SpamDetectionService.MAX_SEQUENCE_LENGTH,
      padding: 'max_length', // ALIGNED WITH COLAB: Forces static [1, 128] tensor shape
    });

    const inputIds: bigint[] = Array.from(
      encoded.input_ids.data as BigInt64Array,
    );
    const attentionMask: bigint[] = Array.from(
      encoded.attention_mask.data as BigInt64Array,
    );

    // Because of padding: 'max_length', sequenceLength is guaranteed to be 128
    const sequenceLength = inputIds.length;

    const feeds: Record<string, ort.Tensor> = {
      input_ids: new ort.Tensor('int64', BigInt64Array.from(inputIds), [
        1,
        sequenceLength,
      ]),
      attention_mask: new ort.Tensor(
        'int64',
        BigInt64Array.from(attentionMask),
        [1, sequenceLength],
      ),
    };

    const output = await this.session.run(feeds);
    const logitsTensor = output['logits'];

    if (logitsTensor === undefined) {
      throw new InternalServerErrorException(
        'Model output did not contain logits.',
      );
    }

    const logits = logitsTensor.data as Float32Array;
    const probabilities = this.softmax([Number(logits[0]), Number(logits[1])]);

    const spamProbability = probabilities[SpamDetectionService.SPAM_INDEX];
    const hamProbability = probabilities[SpamDetectionService.HAM_INDEX];
    const isSpam = spamProbability >= SpamDetectionService.SPAM_THRESHOLD;

    return {
      isSpam,
      label: isSpam ? 'spam' : 'ham',
      spamProbability: this.round(spamProbability),
      hamProbability: this.round(hamProbability),
      threshold: SpamDetectionService.SPAM_THRESHOLD,
      tokenCount: sequenceLength,
    };
  }

  isReady(): boolean {
    return this.session !== null && this.tokenizer !== null;
  }

  private softmax(logits: readonly number[]): number[] {
    const maxLogit = Math.max(...logits);
    const exponentials = logits.map((value) => Math.exp(value - maxLogit));
    const sum = exponentials.reduce((total, value) => total + value, 0);
    return exponentials.map((value) => value / sum);
  }

  private round(value: number): number {
    return Math.round(value * 10000) / 10000;
  }

  private resolveModelPath(): string {
    const modelPath =
      process.env.MODEL_PATH ??
      path.resolve(process.cwd(), 'models', 'model.onnx');

    if (!fs.existsSync(modelPath)) {
      throw new InternalServerErrorException(
        `ONNX model not found at: ${modelPath}`,
      );
    }
    return modelPath;
  }
}
