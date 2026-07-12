import { Module } from '@nestjs/common';
import { SpamDetectionModule } from './spam-detection/spam-detection.module';

@Module({
  imports: [SpamDetectionModule],
})
export class AppModule {}
