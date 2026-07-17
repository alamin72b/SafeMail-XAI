import {
  DEFAULT_API_BASE_URL,
  getApiBaseUrl,
  isValidHttpUrl,
  setApiBaseUrl,
} from '../shared/settings';

document.addEventListener('DOMContentLoaded', (): void => {
  void initialize();
});

async function initialize(): Promise<void> {
  const input = document.getElementById('api-base-url');
  const form = document.getElementById('settings-form');
  const status = document.getElementById('status');

  if (
    !(input instanceof HTMLInputElement) ||
    !(form instanceof HTMLFormElement) ||
    status === null
  ) {
    return;
  }

  input.value = await getApiBaseUrl();
  input.placeholder = DEFAULT_API_BASE_URL;

  form.addEventListener('submit', (event: SubmitEvent): void => {
    event.preventDefault();
    void save(input, status);
  });
}

async function save(
  input: HTMLInputElement,
  status: HTMLElement,
): Promise<void> {
  const value = input.value.trim();
  if (!isValidHttpUrl(value)) {
    showStatus(status, 'Please enter a valid http(s) URL.', true);
    return;
  }
  await setApiBaseUrl(value);
  showStatus(status, 'Saved.', false);
}

function showStatus(
  status: HTMLElement,
  message: string,
  isError: boolean,
): void {
  status.textContent = message;
  status.className = isError ? 'status error' : 'status ok';
}
