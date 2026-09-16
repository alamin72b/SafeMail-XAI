const LAST_SCANNED_EMAIL_BODY_KEY = 'lastScannedEmailBody';

/**
 * Holds only the most recently scanned email body, separately from
 * scanHistory (history.ts), so the popup's on-demand "Explain this" action
 * has real text to send to the (slow) SHAP explainer without persisting
 * full email content for every historical scan.
 */
export async function setLastScannedEmailBody(body: string): Promise<void> {
  await chrome.storage.session.set({ [LAST_SCANNED_EMAIL_BODY_KEY]: body });
}

export async function getLastScannedEmailBody(): Promise<string | null> {
  const stored = await chrome.storage.session.get(
    LAST_SCANNED_EMAIL_BODY_KEY,
  );
  const value: unknown = stored[LAST_SCANNED_EMAIL_BODY_KEY];
  return typeof value === 'string' ? value : null;
}
