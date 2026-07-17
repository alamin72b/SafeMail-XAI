import type { ExplanationProvider } from '../explainability/explanation-provider';
import { renderExplanationInto } from '../explainability/render-explanation';
import type { SpamPredictionResult } from '../shared/types';

const CONTAINER_ID = 'spamguard-badge-container';
const PANEL_ID = 'spamguard-explanation-panel';

export type BadgeState =
  | { readonly kind: 'checking' }
  | {
      readonly kind: 'verdict';
      readonly result: SpamPredictionResult;
      readonly emailBody: string;
    }
  | { readonly kind: 'unavailable'; readonly reason: string };

export function isBadgeRendered(): boolean {
  const container = document.getElementById(CONTAINER_ID);
  return (
    container !== null &&
    container.isConnected &&
    container.childElementCount > 0
  );
}

export function renderBadge(
  subjectElement: HTMLElement,
  state: BadgeState,
  provider: ExplanationProvider,
): void {
  const container = ensureContainer(subjectElement);
  container.replaceChildren();

  const pill = document.createElement('span');
  pill.className = `spamguard-pill spamguard-${stateClass(state)}`;
  pill.textContent = pillText(state);
  if (state.kind === 'unavailable') {
    pill.title = state.reason;
  }
  container.appendChild(pill);

  if (state.kind === 'verdict') {
    const whyButton = document.createElement('button');
    whyButton.type = 'button';
    whyButton.className = 'spamguard-why';
    whyButton.textContent = 'Why?';
    whyButton.addEventListener('click', (): void => {
      void toggleExplanation(container, provider, state.emailBody);
    });
    container.appendChild(whyButton);
  }
}

function ensureContainer(subjectElement: HTMLElement): HTMLElement {
  const existing = document.getElementById(CONTAINER_ID);
  if (existing !== null && existing.isConnected) {
    return existing;
  }
  const container = document.createElement('span');
  container.id = CONTAINER_ID;
  container.className = 'spamguard-container';
  subjectElement.insertAdjacentElement('afterend', container);
  return container;
}

function stateClass(state: BadgeState): string {
  return state.kind === 'verdict' ? state.result.label : state.kind;
}

function pillText(state: BadgeState): string {
  switch (state.kind) {
    case 'checking':
      return 'CHECKING…';
    case 'unavailable':
      return 'SPAM CHECK UNAVAILABLE';
    case 'verdict':
      return state.result.isSpam
        ? `SPAM — ${(state.result.spamProbability * 100).toFixed(1)}%`
        : `HAM — ${(state.result.hamProbability * 100).toFixed(1)}%`;
  }
}

async function toggleExplanation(
  container: HTMLElement,
  provider: ExplanationProvider,
  emailBody: string,
): Promise<void> {
  const existing = document.getElementById(PANEL_ID);
  if (existing !== null) {
    existing.remove();
    return;
  }
  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.className = 'spamguard-explanation-panel';
  container.insertAdjacentElement('afterend', panel);

  const explanation = await provider.explain(emailBody);
  renderExplanationInto(panel, explanation);
}
