import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { SpamDetectionService } from './spam-detection.service';
import { ClassifyEmailDto } from './dto/classify-email.dto';
import {
  ClassificationResponse,
  HealthResponse,
} from './interfaces/classification.interface';

@Controller('spam-detection')
export class SpamDetectionController {
  constructor(private readonly spamDetectionService: SpamDetectionService) {}

  @Post('classify')
  @HttpCode(HttpStatus.OK)
  async classify(
    @Body() dto: ClassifyEmailDto,
  ): Promise<ClassificationResponse> {
    return this.spamDetectionService.classify(dto);
  }

  @Get('health')
  health(): HealthResponse {
    const engineReady = this.spamDetectionService.isReady();
    return { status: engineReady ? 'ok' : 'initializing', engineReady };
  }
}
