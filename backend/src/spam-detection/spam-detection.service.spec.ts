import { Test, TestingModule } from '@nestjs/testing';
import { SpamDetectionService } from './spam-detection.service';

describe('SpamDetectionService', () => {
  let service: SpamDetectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpamDetectionService],
    }).compile();

    service = module.get<SpamDetectionService>(SpamDetectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
