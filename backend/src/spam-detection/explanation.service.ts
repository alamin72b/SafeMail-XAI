import {
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ExplainEmailDto } from './dto/explain-email.dto';
import { ExplanationResponse } from './interfaces/classification.interface';

interface ExplainerErrorBody {
  detail?: string;
}

@Injectable()
export class ExplanationService {
  private readonly logger = new Logger(ExplanationService.name);

  async explain(dto: ExplainEmailDto): Promise<ExplanationResponse> {
    const explainerServiceUrl =
      process.env.EXPLAINER_SERVICE_URL ?? 'http://localhost:8000';

    let response: Response;
    try {
      response = await fetch(`${explainerServiceUrl}/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: dto.body }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to reach explainer service: ${message}`);
      throw new ServiceUnavailableException(
        'Explanation service is unavailable. Is the Python explainer ' +
          `running at ${explainerServiceUrl}?`,
      );
    }

    if (!response.ok) {
      const errorBody = (await response
        .json()
        .catch(() => ({}))) as ExplainerErrorBody;
      throw new HttpException(
        errorBody.detail ??
          `Explainer service responded with status ${response.status}`,
        response.status,
      );
    }

    return (await response.json()) as ExplanationResponse;
  }
}
