import { PlaceholderExplanationProvider } from '../explainability/explanation-provider';
import { renderExplanationInto } from '../explainability/render-explanation';
import { getScanHistory } from '../shared/history';
import type { ScanRecord } from '../shared/types';

const provider = new PlaceholderExplanationProvider();
const dateTimeFormat = new Intl.DateTimeFormat(
  undefined,
  {
    dateStyle: 'medium',
    timeStyle: 'short',
  },
);

document.addEventListener(
  'DOMContentLoaded',
  (): void => {
    void initialize();
  },
);

async function initialize(): Promise<void> {
  const currentVerdict = document.getElementById('current-verdict');
  const historyList = document.getElementById('history-list');
  const whyButton = document.getElementById('why-button');
  const explanationPanel = document.getElementById('explanation-panel');
  const scanSummary = document.getElementById('scan-summary');

  if (
    currentVerdict === null ||
    historyList === null ||
    whyButton === null ||
    explanationPanel === null ||
    scanSummary === null
  ) {
    return;
  }

  const history = await getScanHistory();
  const latest: ScanRecord | undefined =
    history.length > 0 ? history[0] : undefined;

  renderCurrent(
    currentVerdict,
    latest,
    scanSummary,
  );
  renderHistory(
    historyList,
    history,
  );

  if (latest !== undefined) {
    whyButton.hidden = false;
    whyButton.addEventListener(
      'click',
      (): void => {
        whyButton.textContent = explanationPanel.hidden
          ? 'Hide explanation'
          : 'Why this verdict?';
        void toggleExplanation(explanationPanel);
      },
    );
    scanSummary.textContent = `Last scanned ${formatDateTime(latest.scannedAt)}`;
  } else {
    scanSummary.textContent = 'No scans have been recorded in this session yet.';
  }
}

function renderCurrent(
  target: HTMLElement,
  record: ScanRecord | undefined,
  summary: HTMLElement,
): void {
  target.replaceChildren();
  if (record === undefined) {
    const empty = document.createElement('div');
    empty.className = 'scan-empty';
    empty.textContent =
      'Open an email in Gmail and SpamGuard will show the latest classification here.';
    target.appendChild(empty);
    return;
  }
  const top = document.createElement('div');
  top.className = 'verdict-top';

  const title = document.createElement('div');
  title.className = 'verdict-title';
  title.append(
    buildPill(record),
    buildSubject(record),
  );

  const timestamp = document.createElement('span');
  timestamp.className = 'subtext';
  timestamp.textContent = formatDateTime(record.scannedAt);

  top.append(
    title,
    timestamp,
  );

  const confidence = document.createElement('div');
  confidence.className = 'confidence';

  const confidenceRow = document.createElement('div');
  confidenceRow.className = 'confidence-row';

  const confidenceLabel = document.createElement('span');
  confidenceLabel.className = 'confidence-label';
  confidenceLabel.textContent = 'Spam probability';

  const confidenceValue = document.createElement('span');
  confidenceValue.className = 'confidence-value';
  confidenceValue.textContent = `${Math.round(record.spamProbability * 100)}%`;

  const meter = document.createElement('div');
  meter.className = 'meter';

  const meterBar = document.createElement('div');
  meterBar.className = 'meter-bar';
  meterBar.style.width = `${Math.max(
    0,
    Math.min(
      100,
      record.spamProbability * 100,
    ),
  )}%`;

  meter.appendChild(meterBar);
  confidenceRow.append(
    confidenceLabel,
    confidenceValue,
  );
  confidence.append(
    confidenceRow,
    meter,
  );

  const metaGrid = document.createElement('div');
  metaGrid.className = 'meta-grid';

  const subjectMeta = createMetaItem(
    'Subject',
    record.subject.length > 0 ? record.subject : '(no subject)',
  );
  const verdictMeta = createMetaItem(
    'Verdict',
    record.label === 'spam' ? 'Flagged as spam' : 'Marked as safe',
  );

  metaGrid.append(
    subjectMeta,
    verdictMeta,
  );

  target.append(
    top,
    confidence,
    metaGrid,
  );
  summary.textContent = `Last scanned ${formatDateTime(record.scannedAt)}`;
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
    time.textContent = formatShortTime(record.scannedAt);
    item.append(
      time,
      buildPill(record),
      buildSubject(record),
    );
    list.appendChild(item);
  }
}

function buildPill(record: ScanRecord): HTMLSpanElement {
  const pill = document.createElement('span');
  pill.className = `pill pill-${record.label}`;
  pill.textContent =
    record.label === 'spam'
      ? `Spam ${(record.spamProbability * 100).toFixed(0)}%`
      : `Safe ${((1 - record.spamProbability) * 100).toFixed(0)}%`;
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
  renderExplanationInto(
    panel,
    explanation,
  );
  panel.hidden = false;
}

function createMetaItem(
  label: string,
  value: string,
): HTMLElement {
  const item = document.createElement('div');
  item.className = 'meta-item';

  const metaLabel = document.createElement('span');
  metaLabel.className = 'meta-label';
  metaLabel.textContent = label;

  const metaValue = document.createElement('span');
  metaValue.className = 'meta-value';
  metaValue.textContent = value;

  item.append(
    metaLabel,
    metaValue,
  );
  return item;
}

function formatDateTime(value: number): string {
  return dateTimeFormat.format(new Date(value));
}

function formatShortTime(value: number): string {
  return new Intl.DateTimeFormat(
    undefined,
    {
      hour: 'numeric',
      minute: '2-digit',
    },
  ).format(new Date(value));
}
