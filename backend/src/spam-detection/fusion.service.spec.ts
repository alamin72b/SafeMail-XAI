import { Test, TestingModule } from '@nestjs/testing';
import { FusionService } from './fusion.service';

describe('FusionService', () => {
  let service: FusionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FusionService],
    }).compile();

    service = module.get<FusionService>(FusionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
