/* eslint-disable no-bitwise */

// Mapping des catégories vers une couleur d'accent par défaut.
const CATEGORY_ACCENT_MAP: Record<string, string> = {
  control: '#2196F3', // Control -> bleu
  action: '#4CAF50', // Action -> vert
};

export type NodeCardChipTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

export interface NodeCardChip {
  label: string;
  tone?: NodeCardChipTone;
}

export interface NodeCardHTMLParams {
  title: string;
  subtitle?: string;
  description?: string;
  iconName?: string;
  category?: string;
  accentColor?: string;
  body?: string;
  footer?: string;
  chips?: NodeCardChip[];
  inputs?: NodeCardInput[];
  nodeId?: string; // ID du node pour identifier les messages
}

export type NodeCardInputType = 'text' | 'number' | 'switch';

export interface NodeCardInput {
  type: NodeCardInputType;
  name: string;
  label?: string;
  value?: string | number | boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

const CHIP_TONE_CLASS: Record<NodeCardChipTone, string> = {
  default: 'node-chip--default',
  success: 'node-chip--success',
  warning: 'node-chip--warning',
  danger: 'node-chip--danger',
  info: 'node-chip--info',
};

const hexRegex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function normalizeHex(value?: string): string {
  if (!value || !hexRegex.test(value)) {
    return '#6200EE'; // Couleur d'accent par défaut
  }
  if (value.length === 4) {
    return (
      '#' +
      value
        .slice(1)
        .split('')
        .map((char) => char + char)
        .join('')
    );
  }
  return value;
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = normalizeHex(hex);
  const bigint = parseInt(normalized.slice(1), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${Math.min(Math.max(alpha, 0), 1)})`;
}

function sanitizeIconName(iconName?: string): string {
  if (!iconName || typeof iconName !== 'string' || iconName.trim().length === 0) {
    return 'extension';
  }
  return iconName.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
}

function renderChips(chips?: NodeCardChip[]): string {
  if (!chips || chips.length === 0) {
    return '';
  }

  const chipHtml = chips
    .map((chip) => {
      const toneClass = CHIP_TONE_CLASS[chip.tone || 'default'];
      return `<span class="node-chip ${toneClass}">${chip.label}</span>`;
    })
    .join('');

  return `<div class="node-card__chips">${chipHtml}</div>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInputs(inputs?: NodeCardInput[], nodeId?: string): string {
  if (!inputs || inputs.length === 0) return '';

  const html = inputs
    .map((input) => {
      const name = escapeHtml(input.name || '');
      const label = input.label
        ? `<span class="node-card__input-label">${escapeHtml(String(input.label))}</span>`
        : '';

      // Handler pour envoyer la valeur au React Native
      const createChangeHandler = (inputName: string, inputType: NodeCardInputType) => {
        return `
          (function(e){
            var value = e.target.${inputType === 'switch' ? 'checked' : 'value'};
            var rawId = '${nodeId || ''}';
            var derivedId = '';
            if (!rawId || rawId === '${undefined}') {
              var nodeEl = e.target.closest('.drawflow-node');
              if (nodeEl && typeof nodeEl.id === 'string') {
                derivedId = nodeEl.id.replace('node-', '');
              }
            }
            var finalId = rawId && rawId !== '${undefined}' ? rawId : derivedId;
            if (!finalId) {
              console.warn('Missing nodeId for input change:', '${inputName}');
              return;
            }
            try {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'INPUT_VALUE_CHANGED',
                payload: {
                  nodeId: finalId,
                  inputName: '${inputName}',
                  inputType: '${inputType}',
                  value: value
                }
              }));
            } catch(err) {
              console.error('Failed to send input value:', err);
            }
          })(event)
        `;
      };

      const dismissKeyboard = `
        event.preventDefault();
        event.target.blur();
        try {
          window.ReactNativeWebView.postMessage(JSON.stringify({type:'DISMISS_KEYBOARD'}));
        } catch(e) {}
        // Also post again inside a setTimeout to ensure webview receives the message in all environments
        setTimeout(function(){
          try { window.ReactNativeWebView.postMessage(JSON.stringify({type:'DISMISS_KEYBOARD'})); } catch(e) {}
        }, 0);
        return false;
      `;

      if (input.type === 'number') {
        const value = typeof input.value === 'number' ? ` value="${input.value}"` : '';
        const min = typeof input.min === 'number' ? ` min="${input.min}"` : '';
        const max = typeof input.max === 'number' ? ` max="${input.max}"` : '';
        const step = typeof input.step === 'number' ? ` step="${input.step}"` : '';
        return `
          <label class="node-card__input node-card__input--number">${label}
            <input 
              type="number" 
              inputmode="decimal"
              name="${name}"${value}${min}${max}${step}
              onchange="${createChangeHandler(input.name, 'number')}"
              oninput="${createChangeHandler(input.name, 'number')}"
              onkeypress="if(event.key==='Enter'||event.keyCode===13){${dismissKeyboard}}"
            />
          </label>`;
      }

      if (input.type === 'switch') {
        const checked = input.value === true || input.value === 'true' ? ' checked' : '';
        return `
          <label class="node-card__input node-card__input--switch">
            <input 
              type="checkbox"
              name="${name}"${checked}
              onchange="${createChangeHandler(input.name, 'switch')}"
            />
            <span class="node-switch__label">${label}</span>
          </label>`;
      }

      // default to text
      const value =
        typeof input.value === 'number' || typeof input.value === 'boolean'
          ? ` value="${input.value}"`
          : input.value
          ? ` value="${escapeHtml(String(input.value))}"`
          : '';
      const placeholder = input.placeholder
        ? ` placeholder="${escapeHtml(String(input.placeholder))}"`
        : '';
      return `
        <label class="node-card__input node-card__input--text">${label}
          <input 
            type="text" 
            name="${name}"${value}${placeholder}
            onchange="${createChangeHandler(input.name, 'text')}"
            onkeypress="if(event.key==='Enter'||event.keyCode===13){${dismissKeyboard}}"
          />
        </label>`;
    })
    .join('');

  return `<div class="node-card__inputs">${html}</div>`;
}

export function buildNodeCardHTML(params: NodeCardHTMLParams): string {
  const categoryKey = params.category ? params.category.toString().toLowerCase().trim() : '';
  const mappedAccent = categoryKey ? CATEGORY_ACCENT_MAP[categoryKey] : undefined;
  const accent = normalizeHex(mappedAccent || params.accentColor);
  const accentSoft = hexToRgba(accent, 0.18);
  const accentStrong = hexToRgba(accent, 0.55);
  const accentBorder = hexToRgba(accent, 0.35);
  const accentGlow = hexToRgba(accent, 0.45);
  const iconName = sanitizeIconName(params.iconName);
  const subtitle = params.subtitle
    ? `<p class="node-card__subtitle node-subtitle">${params.subtitle}</p>`
    : '';
  const description = params.body
    ? ''
    : params.description
    ? `<p class="node-card__description">${params.description}</p>`
    : '';
  const body = params.body ? `<div class="node-card__body">${params.body}</div>` : '';
  const footer = params.footer ? `<div class="node-card__footer">${params.footer}</div>` : '';
  const categoryBadge = params.category
    ? `<span class="node-card__badge">${params.category}</span>`
    : '';
  const chips = renderChips(params.chips);
  const inputs = renderInputs(params.inputs, params.nodeId);

  return `
    <div class="node-card" style="--node-accent:${accent};--node-accent-soft:${accentSoft};--node-accent-strong:${accentStrong};--node-border:${accentBorder};--node-glow:${accentGlow};">
      <div class="node-card__header title">
        <div class="node-card__titles">
          <div class="node-card__title-row">
            <span class="node-card__title-icon material-symbols-rounded" aria-hidden="true">${iconName}</span>
            <span class="node-card__title node-title">${params.title}</span>
          </div>
          ${subtitle}
        </div>
        ${categoryBadge}
      </div>
      ${chips}
      ${inputs}
      ${description}
      ${body}
      ${footer}
    </div>
  `;
}