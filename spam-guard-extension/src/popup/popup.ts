import { PlaceholderExplanationProvider } from '../explainability/explanation-provider';
import { renderExplanationInto } from '../explainability/render-explanation';
import { getScanHistory } from '../shared/history';
import type { ScanRecord } from '../shared/types';

const provider = new PlaceholderExplanationProvider();

document.addEventListener('DOMContentLoaded', (): void => {
  void initialize();
});

async function initialize(): Promise<void> {
  const currentVerdict = document.getElementById('current-verdict');
  const historyList = document.getElementById('history-list');
  const whyButton = document.getElementById('why-button');
  const explanationPanel = document.getElementById('explanation-panel');

  if (
    currentVerdict === null ||
    historyList === null ||
    whyButton === null ||
    explanationPanel === null
  ) {
    return;
  }

  const history = await getScanHistory();
  const latest: ScanRecord | undefined =
    history.length > 0 ? history[0] : undefined;

  renderCurrent(currentVerdict, latest);
  renderHistory(historyList, history);

  if (latest !== undefined) {
    whyButton.hidden = false;
    whyButton.addEventListener('click', (): void => {
      void toggleExplanation(explanationPanel);
    });
  }
}

function renderCurrent(
  target: HTMLElement,
  record: ScanRecord | undefined,
): void {
  target.replaceChildren();
  if (record === undefined) {
    target.textContent = 'No emails scanned yet in this session.';
    return;
  }
  target.append(buildPill(record), buildSubject(record));
}

function renderHistory(
  list: HTMLElement,
  history: readonly ScanRecord[],
): void {
  list.replaceChildren();
  if (history.length === 0) {
    const item = document.createElement('li');
    item.className = 'empty';
    item.textContent = 'History is empty.';
    list.appendChild(item);
    return;
  }
  for (const record of history) {
    const item = document.createElement('li');
    const time = document.createElement('span');
    time.className = 'time';
    time.textContent = new Date(record.scannedAt).toLocaleTimeString();
    item.append(time, buildPill(record), buildSubject(record));
    list.appendChild(item);
  }
}

function buildPill(record: ScanRecord): HTMLSpanElement {
  const pill = document.createElement('span');
  pill.className = `pill pill-${record.label}`;
  pill.textContent =
    record.label === 'spam'
      ? `SPAM — ${(record.spamProbability * 100).toFixed(1)}%`
      : `HAM — ${((1 - record.spamProbability) * 100).toFixed(1)}%`;
  return pill;
}

function buildSubject(record: ScanRecord): HTMLSpanElement {
  const subject = document.createElement('span');
  subject.className = 'subject';
  subject.textContent =
    record.subject.length > 0 ? record.subject : '(no subject)';
  subject.title = subject.textContent;
  return subject;
}

async function toggleExplanation(panel: HTMLElement): Promise<void> {
  if (!panel.hidden) {
    panel.hidden = true;
    return;
  }
  const explanation = await provider.explain('');
  renderExplanationInto(panel, explanation);
  panel.hidden = false;
}
