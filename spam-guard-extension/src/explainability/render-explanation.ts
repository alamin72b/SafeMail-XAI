import type { SpamExplanation } from './explanation-provider';

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
