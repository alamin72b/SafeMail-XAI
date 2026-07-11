import { Test, TestingModule } from '@nestjs/testing';
import { TokenizerService } from './tokenizer.service';

describe('TokenizerService', () => {
  let service: TokenizerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TokenizerService],
    }).compile();

    service = module.get<TokenizerService>(TokenizerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
