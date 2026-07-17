import type { ScanRecord } from './types';

export const HISTORY_KEY = 'scanHistory';
export const HISTORY_LIMIT = 10;

export async function getScanHistory(): Promise<readonly ScanRecord[]> {
  const stored = await chrome.storage.session.get(HISTORY_KEY);
  return readScanRecords(stored[HISTORY_KEY]);
}

export async function appendScanRecord(record: ScanRecord): Promise<void> {
  const existing = await getScanHistory();
  const updated = [record, ...existing].slice(0, HISTORY_LIMIT);
  await chrome.storage.session.set({ [HISTORY_KEY]: updated });
}

export function readScanRecords(value: unknown): readonly ScanRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isScanRecord);
}

function isScanRecord(value: unknown): value is ScanRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.subject === 'string' &&
    (candidate.label === 'spam' || candidate.label === 'ham') &&
    typeof candidate.spamProbability === 'number' &&
    typeof candidate.scannedAt === 'number'
  );
}