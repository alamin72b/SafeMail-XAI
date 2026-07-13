import { ClassifyRequest, ClassificationResponse } from './types';

const BASE_URL: string =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  public readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface NestErrorBody {
  message?: string | string[];
  statusCode?: number;
  error?: string;
}

export async function classifyEmail(
  payload: ClassifyRequest,
): Promise<ClassificationResponse> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/spam-detection/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ApiError(
      0,
      'Cannot reach the inference API. Is the NestJS backend running on port 4000?',
    );
  }

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;
    try {
      const errorBody = (await response.json()) as NestErrorBody;
      if (Array.isArray(errorBody.message)) {
        detail = errorBody.message.join('; ');
      } else if (typeof errorBody.message === 'string') {
        detail = errorBody.message;
      }
    } catch {
      // Non-JSON error body — keep the default detail message.
    }
    throw new ApiError(response.status, detail);
  }

  return (await response.json()) as ClassificationResponse;
}