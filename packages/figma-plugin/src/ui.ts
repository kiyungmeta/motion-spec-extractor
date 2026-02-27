// Types for plugin messaging
interface PluginMessage {
  type: string;
  data?: unknown;
  message?: string;
  messages?: string[];
}

let parsedData: unknown = null;

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    tab.classList.add('active');
    const tabId = (tab as HTMLElement).dataset.tab;
    document.getElementById(`tab-${tabId}`)?.classList.add('active');
  });
});

// File upload
const dropZone = document.getElementById('drop-zone')!;
const fileInput = document.getElementById('file-input') as HTMLInputElement;

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer?.files[0];
  if (file) handleFile(file);
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (file) handleFile(file);
});

function handleFile(file: File): void {
  if (!file.name.endsWith('.json')) {
    showStatus('Please select a .json file', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target?.result as string;
    processJson(text);
  };
  reader.onerror = () => showStatus('Error reading file', 'error');
  reader.readAsText(file);
}

// Paste JSON
const jsonInput = document.getElementById('json-input') as HTMLTextAreaElement;
let pasteTimer: ReturnType<typeof setTimeout>;

jsonInput.addEventListener('input', () => {
  clearTimeout(pasteTimer);
  pasteTimer = setTimeout(() => {
    if (jsonInput.value.trim()) {
      processJson(jsonInput.value);
    }
  }, 500);
});

// Process JSON
function processJson(text: string): void {
  try {
    parsedData = JSON.parse(text);
    showPreview(parsedData);
    (document.getElementById('generate-btn') as HTMLButtonElement).disabled = false;
    showStatus('JSON loaded successfully', 'success');
  } catch (err) {
    parsedData = null;
    (document.getElementById('generate-btn') as HTMLButtonElement).disabled = true;
    hidePreview();
    showStatus('Invalid JSON: ' + (err instanceof Error ? err.message : String(err)), 'error');
  }
}

// Preview
function showPreview(data: any): void {
  const section = document.getElementById('preview-section')!;
  section.style.display = 'block';

  const comp = data.composition || {};
  const layers = comp.layers || [];
  const animated = layers.filter((l: any) => l.animationSummary?.isAnimated);
  const totalKf = layers.reduce((sum: number, l: any) => sum + (l.animationSummary?.totalKeyframes || 0), 0);

  setText('preview-name', comp.name || 'Unknown');
  setText('preview-dims', `${comp.width || 0} × ${comp.height || 0}`);
  setText('preview-fps', `${(comp.frameRate || 0).toFixed(2)} fps`);
  setText('preview-duration', `${(comp.duration || 0).toFixed(2)}s`);
  setText('preview-layers', String(layers.length));
  setText('preview-animated', String(animated.length));
  setText('preview-keyframes', String(totalKf));
}

function hidePreview(): void {
  document.getElementById('preview-section')!.style.display = 'none';
}

function setText(id: string, value: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// Status messages
function showStatus(message: string, type: 'error' | 'success' | 'warning'): void {
  const section = document.getElementById('status-section')!;
  const msgEl = document.getElementById('status-message')!;
  section.style.display = 'block';
  msgEl.textContent = message;
  msgEl.className = 'status-message ' + type;
}

// Buttons
document.getElementById('generate-btn')!.addEventListener('click', () => {
  if (!parsedData) return;

  const btn = document.getElementById('generate-btn') as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = 'Generating...';

  parent.postMessage({ pluginMessage: { type: 'generate', data: parsedData } }, '*');
});

document.getElementById('cancel-btn')!.addEventListener('click', () => {
  parent.postMessage({ pluginMessage: { type: 'cancel' } }, '*');
});

// Listen for messages from the plugin sandbox
window.onmessage = (event: MessageEvent) => {
  const msg = event.data.pluginMessage as PluginMessage;
  if (!msg) return;

  switch (msg.type) {
    case 'success':
      showStatus(msg.message || 'Done!', 'success');
      resetButton();
      break;
    case 'error':
      showStatus(msg.message || 'An error occurred', 'error');
      resetButton();
      break;
    case 'warnings':
      if (msg.messages) {
        showStatus('Warnings: ' + msg.messages.join(', '), 'warning');
      }
      break;
  }
};

function resetButton(): void {
  const btn = document.getElementById('generate-btn') as HTMLButtonElement;
  btn.disabled = false;
  btn.textContent = 'Generate Motion Spec';
}
