import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { SpamDetectionService } from './spam-detection.service';
import { ExplanationService } from './explanation.service';
import { ClassifyEmailDto } from './dto/classify-email.dto';
import { ExplainEmailDto } from './dto/explain-email.dto';
import {
  ClassificationResponse,
  ExplanationResponse,
  HealthResponse,
} from './interfaces/classification.interface';

@Controller('spam-detection')
export class SpamDetectionController {
  constructor(
    private readonly spamDetectionService: SpamDetectionService,
    private readonly explanationService: ExplanationService,
  ) {}

  @Post('classify')
  @HttpCode(HttpStatus.OK)
  async classify(
    @Body() dto: ClassifyEmailDto,
  ): Promise<ClassificationResponse> {
    const result = await this.spamDetectionService.classify(dto);

    return {
      verdict: result.isSpam ? 'SPAM' : 'HAM',
      spamProbability: result.spamProbability,
      hamProbability: result.hamProbability,
      logits: [result.hamProbability, result.spamProbability],
      tokenCount: result.tokenCount ?? 0,
      inferenceTimeMs: 0,
      model: {
        name: 'onnx-model',
        quantization: 'quantized',
        runtime: 'onnxruntime-node',
      },
      processedAt: new Date().toISOString(),
    };
  }

  @Get('health')
  health(): HealthResponse {
    const engineReady = this.spamDetectionService.isReady();
    return { status: engineReady ? 'ok' : 'initializing', engineReady };
  }

  @Post('explain')
  @HttpCode(HttpStatus.OK)
  async explain(
    @Body() dto: ExplainEmailDto,
  ): Promise<ExplanationResponse> {
    return this.explanationService.explain(dto);
  }
}
