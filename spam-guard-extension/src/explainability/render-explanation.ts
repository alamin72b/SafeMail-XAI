import type { SpamExplanation, TokenAttribution } from './explanation-provider';

export function renderExplanationInto(
  target: HTMLElement,
  explanation: SpamExplanation,
): void {
  target.replaceChildren();

  const heading = document.createElement('p');
  heading.className = 'spamguard-explanation-method';
  heading.textContent = `Explanation method: ${explanation.method}`;
  target.appendChild(heading);

  if (explanation.attributions.length === 0) {
    const summary = document.createElement('p');
    summary.className = 'spamguard-explanation-summary';
    summary.textContent = explanation.summary;
    target.appendChild(summary);
    return;
  }

  if (explanation.wasTruncated === true) {
    const notice = document.createElement('p');
    notice.className = 'spamguard-explanation-truncated';
    notice.textContent =
      'Only the first 128 tokens were analyzed; text past this point ' +
      'was not seen by the model.';
    target.appendChild(notice);
  }

  const heatmap = document.createElement('div');
  heatmap.className = 'spamguard-heatmap';
  for (const attribution of explanation.attributions) {
    const token = document.createElement('span');
    token.className = 'spamguard-token';
    token.textContent = attribution.token;
    token.style.backgroundColor = importanceToColor(attribution.importance);
    token.title = `importance: ${attribution.importance.toFixed(4)}`;
    heatmap.appendChild(token);
  }
  target.appendChild(heatmap);

  if (explanation.topSpam !== undefined && explanation.topSpam.length > 0) {
    target.appendChild(
      renderSignalList(
        'Top spam signals',
        explanation.topSpam,
        'spam',
      ),
    );
  }
  if (explanation.topHam !== undefined && explanation.topHam.length > 0) {
    target.appendChild(
      renderSignalList(
        'Top ham signals',
        explanation.topHam,
        'ham',
      ),
    );
  }

  if (explanation.caveat !== undefined) {
    const caveat = document.createElement('p');
    caveat.className = 'spamguard-explanation-caveat';
    caveat.textContent = explanation.caveat;
    target.appendChild(caveat);
  }
}

function renderSignalList(
  heading: string,
  attributions: readonly TokenAttribution[],
  kind: 'spam' | 'ham',
): HTMLElement {
  const container = document.createElement('div');
  container.className = `spamguard-signal-list spamguard-signal-list-${kind}`;

  const title = document.createElement('p');
  title.className = 'spamguard-signal-list-heading';
  title.textContent = heading;
  container.appendChild(title);

  const list = document.createElement('ul');
  list.className = 'spamguard-signal-list-items';
  for (const attribution of attributions) {
    const item = document.createElement('li');
    item.textContent =
      `${attribution.token.trim()} (${attribution.importance.toFixed(3)})`;
    list.appendChild(item);
  }
  container.appendChild(list);

  return container;
}

function importanceToColor(importance: number): string {
  const clamped = Math.max(
    -1,
    Math.min(
      1,
      importance,
    ),
  );
  const alpha = Math.abs(clamped) * 0.75;
  return clamped >= 0
    ? `rgba(220, 53, 69, ${alpha})`
    : `rgba(25, 135, 84, ${alpha})`;
}
