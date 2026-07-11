import { Test, TestingModule } from '@nestjs/testing';
import { SpamDetectionController } from './spam-detection.controller';

describe('SpamDetectionController', () => {
  let controller: SpamDetectionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpamDetectionController],
    }).compile();

    controller = module.get<SpamDetectionController>(SpamDetectionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
