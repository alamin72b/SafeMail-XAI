import { Module } from '@nestjs/common';
import { SpamDetectionController } from './spam-detection.controller';
import { SpamDetectionService } from './spam-detection.service';
import { TokenizerService } from './tokenizer.service';
import { FusionService } from './fusion.service';

@Module({
  controllers: [SpamDetectionController],
  providers: [SpamDetectionService, TokenizerService, FusionService]
})
export class SpamDetectionModule {}
