const HOST_ID = "privacy-guardian-overlay-host";

const STYLES = `
  :host { all: initial; }
  .backdrop {
    position: fixed; inset: 0; z-index: 2147483647;
    background: rgba(0,0,0,0.55);
    display: flex; align-items: center; justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  }
  .card {
    width: min(560px, 92vw); max-height: 82vh; overflow-y: auto;
    background: #1c1c1e; color: #f2f2f2; border-radius: 14px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.4);
    padding: 20px 22px;
  }
  .header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .header h1 { font-size: 15px; margin: 0; font-weight: 600; }
  .stage-label { font-size: 12px; color: #9aa0a6; margin-bottom: 12px; }
  .spinner {
    display: inline-block; width: 14px; height: 14px; border-radius: 50%;
    border: 2px solid #555; border-top-color: #f2f2f2;
    animation: spin 0.8s linear infinite; margin-right: 6px; vertical-align: -2px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .text-preview {
    background: #111; border-radius: 8px; padding: 10px 12px; font-size: 12px;
    line-height: 1.5; max-height: 220px; overflow-y: auto; white-space: pre-wrap;
    color: #c7c7c7; margin-bottom: 8px;
  }
  .findings-list { padding-left: 16px; margin: 0; font-size: 13px; line-height: 1.6; }
  .findings-list li { margin-bottom: 10px; }
  .clause { color: #9aa0a6; font-style: italic; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
  th, td { text-align: left; padding: 6px 4px; border-bottom: 1px solid #333; }
  .footer { display: flex; gap: 10px; margin-top: 16px; justify-content: flex-end; }
  button {
    font: inherit; font-size: 13px; padding: 8px 14px; border-radius: 8px;
    border: 1px solid #444; background: #2c2c2e; color: #f2f2f2; cursor: pointer;
  }
  button.primary { background: #f2f2f2; color: #111; border-color: #f2f2f2; }
  button:hover { filter: brightness(1.1); }
  .links { font-size: 12px; color: #9aa0a6; margin-bottom: 4px; }
`;

let hostEl: HTMLElement | null = null;
let shadow: ShadowRoot | null = null;
let bodyEl: HTMLElement | null = null;

function ensureMounted() {
  if (hostEl) return;
  hostEl = document.createElement("div");
  hostEl.id = HOST_ID;
  document.documentElement.appendChild(hostEl);
  shadow = hostEl.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = STYLES;
  shadow.appendChild(style);

  const backdrop = document.createElement("div");
  backdrop.className = "backdrop";
  shadow.appendChild(backdrop);

  const card = document.createElement("div");
  card.className = "card";
  backdrop.appendChild(card);

  const header = document.createElement("div");
  header.className = "header";
  header.innerHTML = `<h1>🛡️ Privacy & Terms Guardian</h1>`;
  card.appendChild(header);

  bodyEl = document.createElement("div");
  bodyEl.id = "guardian-body";
  card.appendChild(bodyEl);
}

export function showOverlay() {
  ensureMounted();
}

export function hideOverlay() {
  hostEl?.remove();
  hostEl = null;
  shadow = null;
  bodyEl = null;
}

export function isOverlayVisible(): boolean {
  return hostEl !== null;
}

/** Sets the overlay's body to raw HTML — caller is responsible for escaping any untrusted text. */
export function renderStage(html: string) {
  ensureMounted();
  if (bodyEl) bodyEl.innerHTML = html;
}

export function onAction(selector: string, handler: (el: HTMLElement) => void) {
  shadow?.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    el.addEventListener("click", () => handler(el), { once: true });
  });
}
