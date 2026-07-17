export interface ExtractedEmail {
  readonly subject: string;
  readonly body: string;
}

const MAX_BODY_CHARS = 20000;
const REMOVABLE_SELECTORS =
  'div.gmail_quote, blockquote, div[data-smartmail="gmail_signature"], .gmail_signature';

export function findSubjectElement(root: Document): HTMLElement | null {
  return root.querySelector<HTMLElement>('h2.hP');
}

export function extractOpenEmail(root: Document): ExtractedEmail | null {
  const subjectElement = findSubjectElement(root);
  if (subjectElement === null) {
    return null;
  }

  const bodyElements = root.querySelectorAll<HTMLElement>('div.a3s');
  if (bodyElements.length === 0) {
    return null;
  }

  const latestBody = bodyElements[bodyElements.length - 1];
  const body = normalizeWhitespace(cleanBodyText(latestBody));
  if (body.length === 0) {
    return null;
  }

  const subject = normalizeWhitespace(subjectElement.textContent ?? '');
  return { subject, body: body.slice(0, MAX_BODY_CHARS) };
}

function cleanBodyText(element: HTMLElement): string {
  const clone = element.cloneNode(true);
  if (!(clone instanceof HTMLElement)) {
    return element.textContent ?? '';
  }
  for (const removable of Array.from(
    clone.querySelectorAll(REMOVABLE_SELECTORS),
  )) {
    removable.remove();
  }
  return clone.textContent ?? '';
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
