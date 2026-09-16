import { Module } from '@nestjs/common';
import { SpamDetectionController } from './spam-detection.controller';
import { SpamDetectionService } from './spam-detection.service';
import { ExplanationService } from './explanation.service';
import { TokenizerService } from './tokenizer.service';

@Module({
  controllers: [SpamDetectionController],
  providers: [SpamDetectionService, ExplanationService, TokenizerService],
})
export class SpamDetectionModule {}
