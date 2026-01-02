const dismissKeyboard = `
  event.preventDefault();
  event.target.blur();
  try {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DISMISS_KEYBOARD' }));
  } catch (e) {}
  setTimeout(function () {
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DISMISS_KEYBOARD' }));
    } catch (e) {}
  }, 0);
  return false;
`;

const CATEGORY_ACCENT_MAP: Record<string, string> = {
  control: '#2196F3',
  action: '#4CAF50',
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
  nodeId?: string;
  theme?: 'dark' | 'light';
}

export type NodeCardInputType = 'text' | 'number' | 'switch' | 'color' | 'selector';

export interface SelectorOption {
  label: string;
  value: string;
}

export interface NodeCardInput {
  type: NodeCardInputType;
  name: string;
  label?: string;
  value?: string | number | boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: SelectorOption[]; // Pour le type selector
}

const CHIP_TONE_CLASS: Record<NodeCardChipTone, string> = {
  default: 'node-chip--default',
  success: 'node-chip--success',
  warning: 'node-chip--warning',
  danger: 'node-chip--danger',
  info: 'node-chip--info',
};

let cachedTheme: 'dark' | 'light' = 'dark';

export function setNodeCardTheme(theme: 'dark' | 'light'): void {
  cachedTheme = theme === 'light' ? 'light' : 'dark';
}

const hexRegex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function normalizeHex(value?: string): string {
  if (!value || !hexRegex.test(value)) {
    return '#6200EE';
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getCurrentTheme(): 'dark' | 'light' {
  try {
    if (typeof document === 'undefined' || !document.documentElement) return cachedTheme;
    const attr = document.documentElement.getAttribute('data-luca-theme');
    if (attr === 'light' || attr === 'dark') return attr;
    return document.documentElement.classList.contains('dark-theme') ? 'dark' : 'light';
  } catch (e) {
    return cachedTheme;
  }
}

function renderChips(chips?: NodeCardChip[]): string {
  if (!chips || chips.length === 0) return '';
  const chipHtml = chips
    .map((chip) => {
      const toneClass = CHIP_TONE_CLASS[chip.tone || 'default'];
      return `<span class="node-chip ${toneClass}">${escapeHtml(chip.label)}</span>`;
    })
    .join('');
  return `<div class="node-card__chips">${chipHtml}</div>`;
}

function renderInputs(inputs?: NodeCardInput[], nodeId?: string): string {
  if (!inputs || inputs.length === 0) return '';

  const createChangeHandler = (inputName: string, inputType: NodeCardInputType) => {
    return `(function(e){var value=e.target.${
      inputType === 'switch' ? 'checked' : 'value'
    };var rawId='${
      nodeId || ''
    }';var derivedId='';if(!rawId||rawId==='${undefined}'){var nodeEl=e.target.closest('.drawflow-node');if(nodeEl&&typeof nodeEl.id==='string'){derivedId=nodeEl.id.replace('node-','');}}var finalId=rawId&&rawId!=='${undefined}'?rawId:derivedId;if(!finalId){console.warn('Missing nodeId for input change:','${inputName}');return;}try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'INPUT_VALUE_CHANGED',payload:{nodeId:finalId,inputName:'${inputName}',inputType:'${inputType}',value:value}}));}catch(err){console.error('Failed to send input value:',err);}})(event)`;
  };

  const html = inputs
    .map((input) => {
      const name = escapeHtml(input.name || '');
      const label = input.label
        ? `<span class="node-card__input-label">${escapeHtml(String(input.label))}</span>`
        : '';

      switch (input.type) {
            case 'text': {
              const value = typeof input.value === 'string' ? ` value="${escapeHtml(input.value)}"` : '';
              const placeholder = input.placeholder
                ? ` placeholder="${escapeHtml(String(input.placeholder))}"`
                : '';
              return `<label class="node-card__input node-card__input--text">${label}<input type="text" name="${name}"${value}${placeholder} onchange="${createChangeHandler(
                input.name,
                'text'
              )}" oninput="${createChangeHandler(
                input.name,
                'text'
              )}" onkeypress="if(event.key==='Enter'||event.keyCode===13){${dismissKeyboard}}"/></label>`;
            }

        case 'number': {
          const value = typeof input.value === 'number' ? ` value="${input.value}"` : '';
          const min = typeof input.min === 'number' ? ` min="${input.min}"` : '';
          const max = typeof input.max === 'number' ? ` max="${input.max}"` : '';
          const step = typeof input.step === 'number' ? ` step="${input.step}"` : '';
          return `<label class="node-card__input node-card__input--number">${label}<input type="number" inputmode="decimal" name="${name}"${value}${min}${max}${step} onchange="${createChangeHandler(
            input.name,
            'number'
          )}" oninput="${createChangeHandler(
            input.name,
            'number'
          )}" onkeypress="if(event.key==='Enter'||event.keyCode===13){${dismissKeyboard}}"/></label>`;
        }

        case 'switch': {
          const checked = input.value === true || input.value === 'true' ? ' checked' : '';
          return `<div class="node-card__input node-card__input--switch"><label class="node-switch__label">${label}</label><input type="checkbox" name="${name}"${checked} onchange="${createChangeHandler(
            input.name,
            'switch'
          )}"/></div>`;
        }

        case 'color': {
          const value = input.value ? ` value="${escapeHtml(String(input.value))}"` : '';
          return `<label class="node-card__input node-card__input--color">${label}<div class="color-input-wrapper"><input type="color" name="${name}" id="color-picker-${nodeId}" class="color-picker"${value} onchange="(function(e){try{var txt=e.target.parentNode.querySelector('#color-text-${nodeId}');if(txt)txt.value=e.target.value;}catch(err){}${createChangeHandler(
            input.name,
            'color'
          )}})(event)"/><input type="text" name="${name}_text" id="color-text-${nodeId}" class="color-text" placeholder="#000000"${value} onchange="(function(e){try{var v=e.target.value;if(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)){var pick=e.target.parentNode.querySelector('#color-picker-${nodeId}');if(pick)pick.value=v;${createChangeHandler(
            input.name,
            'color'
          )}}}catch(err){}})(event)" onkeypress="if(event.key==='Enter'||event.keyCode===13){${dismissKeyboard}}"/></div></label>`;
        }

        case 'selector': {
          const options = input.options || [];
          const currentValue = input.value ? String(input.value) : '';
          const optionsHtml = options
            .map((opt) => {
              const selected = opt.value === currentValue ? ' selected' : '';
              return `<option value="${escapeHtml(opt.value)}"${selected}>${escapeHtml(opt.label)}</option>`;
            })
            .join('');
          return `<label class="node-card__input node-card__input--selector">${label}<select name="${name}" onchange="${createChangeHandler(
            input.name,
            'selector'
          )}">${optionsHtml}</select></label>`;
        }

        default:
          return '';
      }
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
  const theme = params.theme || getCurrentTheme();

  const subtitle = params.subtitle
    ? `<p class="node-card__subtitle">${escapeHtml(params.subtitle)}</p>`
    : '';

  const description = params.description
    ? `<p class="node-card__description">${escapeHtml(params.description)}</p>`
    : '';

  const body = params.body ? `<div class="node-card__body">${params.body}</div>` : '';

  const footer = params.footer ? `<div class="node-card__footer">${params.footer}</div>` : '';

  const categoryBadge = params.category
    ? `<span class="node-card__badge">${escapeHtml(params.category)}</span>`
    : '';

  const chips = renderChips(params.chips);
  const inputs = renderInputs(params.inputs, params.nodeId);

  return `
    <div
      class="node-card"
      data-luca-theme="${theme}"
      style="--node-accent:${accent};--node-accent-soft:${accentSoft};--node-accent-strong:${accentStrong};--node-border:${accentBorder};--node-glow:${accentGlow};">
      <div class="node-card__header">
        <div class="node-card__titles">
          <div class="node-card__title-row">
            <span class="node-card__title-icon material-symbols-rounded" aria-hidden="true">${iconName}</span>
            <span class="node-card__title">${escapeHtml(params.title)}</span>
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
    </div>`;
}