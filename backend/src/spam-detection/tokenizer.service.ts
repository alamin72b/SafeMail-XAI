import {
  Injectable,
  Logger,
  OnModuleInit,
  InternalServerErrorException,
} from '@nestjs/common';
// 1. Import ONLY the types. This gives you strict safety without loading the actual AI models at boot time.
import type { PreTrainedTokenizer } from '@xenova/transformers';
/**
 * TokenizerService
 * ----------------
 * Wraps the @xenova/transformers SentencePiece tokenizer for XLM-RoBERTa.
 * The tokenizer files (sentencepiece vocab + merges) are pulled from the
 * Hugging Face hub on first startup and cached locally, so subsequent boots
 * are fully offline. Because your model is a fine-tune of xlm-roberta-base,
 * the base vocabulary is byte-identical to what was used during training.
 */
@Injectable()
export class TokenizerService implements OnModuleInit {
  private readonly logger = new Logger(TokenizerService.name);
  private tokenizer: PreTrainedTokenizer | undefined;

  /** XLM-RoBERTa maximum sequence length (positions 0/1 reserved). */
  public static readonly MAX_LENGTH = 512;

  async onModuleInit(): Promise<void> {
    const { AutoTokenizer, env } = await import('@xenova/transformers');

    // Cache tokenizer artifacts next to the app so production boots are offline.
    env.cacheDir = process.env.TOKENIZER_CACHE_DIR ?? './.tokenizer-cache';
    env.allowLocalModels = true;

    const started = Date.now();
    this.tokenizer = await AutoTokenizer.from_pretrained(
      process.env.TOKENIZER_ID ?? 'Xenova/xlm-roberta-base',
    );
    this.logger.log(
      `✅ XLM-RoBERTa SentencePiece tokenizer ready in ${Date.now() - started}ms`,
    );
  }

  /**
   * Encodes raw multilingual text into model-ready int64 tensors.
   * Applies the exact special-token layout XLM-R expects: <s> ... </s>
   */
  encode(text: string): {
    inputIds: BigInt64Array;
    attentionMask: BigInt64Array;
    length: number;
  } {
    if (!this.tokenizer) {
      throw new InternalServerErrorException(
        'Tokenizer is not initialized yet',
      );
    }

    // 1. Define the shape of the data
    interface TokenizerOutput {
      input_ids: ArrayLike<number>;
      attention_mask: ArrayLike<number>;
    }

    // 2. Call the function normally, and cast the RESULT directly
    const encoded = this.tokenizer(text, {
      truncation: true,
      max_length: TokenizerService.MAX_LENGTH,
      padding: false,
      add_special_tokens: true,
      return_tensor: false,
    }) as TokenizerOutput; // <--- Right here!
    // @xenova/transformers returns number[] when return_tensor is false.
    const ids: number[] = Array.from(encoded.input_ids, Number);
    const mask: number[] = Array.from(encoded.attention_mask, Number);

    if (ids.length === 0) {
      throw new InternalServerErrorException(
        'Tokenization produced an empty sequence',
      );
    }

    const inputIds = new BigInt64Array(ids.length);
    const attentionMask = new BigInt64Array(mask.length);
    for (let i = 0; i < ids.length; i++) {
      inputIds[i] = BigInt(ids[i]);
      attentionMask[i] = BigInt(mask[i]);
    }

    return { inputIds, attentionMask, length: ids.length };
  }
}
