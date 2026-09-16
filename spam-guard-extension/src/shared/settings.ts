export const DEFAULT_API_BASE_URL = 'http://localhost:4000/api/v1';

const STORAGE_KEY = 'apiBaseUrl';

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function getApiBaseUrl(): Promise<string> {
  const stored = await chrome.storage.sync.get(STORAGE_KEY);
  const value: unknown = stored[STORAGE_KEY];
  if (typeof value === 'string' && isValidHttpUrl(value)) {
    return normalizeBaseUrl(value);
  }
  return DEFAULT_API_BASE_URL;
}

export async function setApiBaseUrl(url: string): Promise<void> {
  if (!isValidHttpUrl(url)) {
    throw new Error(`Invalid API base URL: ${url}`);
  }
  await chrome.storage.sync.set({ [STORAGE_KEY]: normalizeBaseUrl(url) });
}

function normalizeBaseUrl(url: string): string {
  return url.endsWith('/') ? url.slice(
    0,
    -1,
  ) : url;
}
