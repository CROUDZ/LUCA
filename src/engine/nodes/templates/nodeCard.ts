/* eslint-disable no-bitwise */
const DEFAULT_ACCENT = '#8b5cf6';

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

export function buildNodeCardHTML(params: NodeCardHTMLParams): string {
  const accent = normalizeHex(params.accentColor);
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
      ${description}
      ${body}
      ${footer}
    </div>
  `;
}
