/* eslint-disable no-bitwise */
import { basePalette } from '../../../styles/global';

const DEFAULT_ACCENT = basePalette.primarySoft || basePalette.primary;

// Mapping des catégories vers une couleur d'accent par défaut.
// Ces valeurs devraient correspondre aux données de la base de données /
// au registre des nodes. Les clés sont comparées en lowercase.
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
    return DEFAULT_ACCENT;
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

function renderInputs(inputs?: NodeCardInput[]): string {
  if (!inputs || inputs.length === 0) return '';

  const html = inputs
    .map((input) => {
      const name = escapeHtml(input.name || '');
      const label = input.label
        ? `<span class="node-card__input-label">${escapeHtml(String(input.label))}</span>`
        : '';

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
              onkeypress="if(event.key==='Enter'||event.keyCode===13){event.preventDefault();event.target.blur();return false;}"
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
            onkeypress="if(event.key==='Enter'||event.keyCode===13){event.preventDefault();event.target.blur();return false;}"
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
  const inputs = renderInputs(params.inputs);

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