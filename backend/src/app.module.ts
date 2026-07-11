import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SpamDetectionModule } from './spam-detection/spam-detection.module';

@Module({
  imports: [SpamDetectionModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
