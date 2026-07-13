import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as ort from 'onnxruntime-node';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { TokenizerService } from './tokenizer.service';
import { ClassifyEmailDto } from './dto/classify-email.dto';
import { ClassificationResponse } from './interfaces/classification.interface';

// Define the missing release method explicitly to maintain strict type safety
interface ManagedSession extends ort.InferenceSession {
  release?: () => Promise<void>;
}

/**
 * SpamDetectionService — Embedded Inference Engine.
 *
 * Loads model_quantized.onnx directly into process memory at boot via
 * onnxruntime-node. No Python sidecar, no network hop. Per-request flow:
 * validate → tokenize → session.run() → softmax → response.
 */
@Injectable()
export class SpamDetectionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SpamDetectionService.name);

  // Implemented the ManagedSession interface here
  private session: ManagedSession | null = null;

  private static readonly MODEL_NAME = 'xlm-roberta-base (fine-tuned)';
  /** Label mapping from the fine-tuning config: index 0 = ham, index 1 = spam. */
  private static readonly HAM_INDEX = 0;
  private static readonly SPAM_INDEX = 1;
  /** Decision threshold on P(spam | text). */
  private static readonly SPAM_THRESHOLD = 0.5;

  constructor(private readonly tokenizerService: TokenizerService) {}

  // ------------------------------------------------------------- lifecycle

  async onModuleInit(): Promise<void> {
    const modelPath = path.resolve(
      process.env.MODEL_PATH ??
        path.join(process.cwd(), 'models', 'model_quantized.onnx'),
    );

    if (!fs.existsSync(modelPath)) {
      this.logger.error(`Model file not found at: ${modelPath}`);
      throw new Error(
        `model_quantized.onnx not found at ${modelPath}. ` +
          `Place the file in backend/models/ or set the MODEL_PATH environment variable.`,
      );
    }

    const startedAt = Date.now();
    this.session = await ort.InferenceSession.create(modelPath, {
      executionProviders: ['cpu'],
      graphOptimizationLevel: 'all',
      // INT8 quantized transformer models benefit from intra-op parallelism.
      intraOpNumThreads: Math.max(1, Math.min(4, os.cpus().length)),
      interOpNumThreads: 1,
      enableCpuMemArena: true,
      enableMemPattern: true,
    });

    this.logger.log(
      `✅ ONNX session loaded in ${Date.now() - startedAt}ms | ` +
        `inputs: [${this.session.inputNames.join(', ')}] | ` +
        `outputs: [${this.session.outputNames.join(', ')}]`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    // Safely executes release if the method exists in the runtime definition
    if (this.session?.release) {
      await this.session.release();
    }

    this.session = null;
    this.logger.log('ONNX session released');
  }

  isReady(): boolean {
    return this.session !== null;
  }

  // ------------------------------------------------------------- inference

  async classify(dto: ClassifyEmailDto): Promise<ClassificationResponse> {
    if (this.session === null) {
      throw new ServiceUnavailableException(
        'Inference engine is not ready. Retry shortly.',
      );
    }

    const { inputIds, attentionMask, length } = this.tokenizerService.encode(
      dto.body,
    );

    const feeds: Record<string, ort.Tensor> = {
      input_ids: new ort.Tensor('int64', inputIds, [1, length]),
      attention_mask: new ort.Tensor('int64', attentionMask, [1, length]),
    };

    // Defensive alignment with the actual graph inputs: some ONNX exports of
    // sequence-classification models also declare token_type_ids.
    if (this.session.inputNames.includes('token_type_ids')) {
      feeds['token_type_ids'] = new ort.Tensor(
        'int64',
        new BigInt64Array(length),
        [1, length],
      );
    }

    let results: Record<string, ort.Tensor>;
    const inferenceStart = process.hrtime.bigint();
    try {
      results = await this.session.run(feeds);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`ONNX inference failed: ${message}`);
      throw new InternalServerErrorException('Model inference failed');
    }
    const inferenceTimeMs =
      Number(process.hrtime.bigint() - inferenceStart) / 1e6;

    const outputName = this.session.outputNames.includes('logits')
      ? 'logits'
      : this.session.outputNames[0];
    const logitsTensor = results[outputName];

    if (logitsTensor === undefined) {
      throw new InternalServerErrorException(
        `Model output "${outputName}" is missing`,
      );
    }

    const logitsData = logitsTensor.data as Float32Array;
    if (logitsData.length < 2) {
      throw new InternalServerErrorException(
        `Unexpected logits shape: expected 2 classes, got ${logitsData.length}`,
      );
    }

    const hamLogit = logitsData[SpamDetectionService.HAM_INDEX];
    const spamLogit = logitsData[SpamDetectionService.SPAM_INDEX];
    const [hamProbability, spamProbability] = this.softmax([
      hamLogit,
      spamLogit,
    ]);

    return {
      verdict:
        spamProbability >= SpamDetectionService.SPAM_THRESHOLD ? 'SPAM' : 'HAM',
      spamProbability: this.round(spamProbability),
      hamProbability: this.round(hamProbability),
      logits: [this.round(hamLogit), this.round(spamLogit)],
      tokenCount: length,
      inferenceTimeMs: Math.round(inferenceTimeMs * 100) / 100,
      model: {
        name: SpamDetectionService.MODEL_NAME,
        quantization: 'INT8 (dynamic)',
        runtime: 'onnxruntime-node',
      },
      processedAt: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------- maths

  private softmax(logits: readonly number[]): number[] {
    const max = Math.max(...logits);
    const exps = logits.map((logit) => Math.exp(logit - max));
    const sum = exps.reduce((acc, value) => acc + value, 0);
    return exps.map((value) => value / sum);
  }

  private round(value: number): number {
    return Math.round(value * 10_000) / 10_000;
  }
}
