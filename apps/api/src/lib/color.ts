export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  const shortMatch = /^#([0-9a-f]{3})$/.exec(trimmed);
  if (shortMatch) {
    const chars = shortMatch[1];
    return `#${chars
      .split('')
      .map((char) => `${char}${char}`)
      .join('')}`;
  }
  return /^#([0-9a-f]{6})$/.test(trimmed) ? trimmed : null;
}

export function hexToRgb(value: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeHexColor(value);
  if (!normalized) return null;
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16)
  };
}

/**
 * Converts a hex color string to HSV components.
 * H is in [0, 360), S and V are in [0, 1].
 */
export function hexToHsv(value: string): { h: number; s: number; v: number } | null {
  const rgb = hexToRgb(value);
  if (!rgb) return null;
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const v = max;
  const s = max === 0 ? 0 : delta / max;
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, v };
}

export function classifyColorFamily(value: string): string {
  const hsv = hexToHsv(value);
  if (!hsv) return 'other';
  const { h, s, v } = hsv;
  // Derive lightness equivalent used for dark/light thresholds (0–255 scale).
  // Equivalent to (max + min) / 2 in the original 0–255 RGB computation.
  const lightness = v * (2 - s) * 255 / 2;

  if (s < 0.12) {
    if (lightness < 50) return 'neutral-dark';
    if (lightness > 210) return 'neutral-light';
    return 'neutral-mid';
  }

  if (h < 20 || h >= 340) return lightness < 110 ? 'red-dark' : 'red';
  if (h < 45) return 'orange';
  if (h < 70) return 'yellow';
  if (h < 160) return 'green';
  if (h < 205) return 'cyan';
  if (h < 255) return lightness < 110 ? 'blue-dark' : 'blue';
  if (h < 300) return 'purple';
  return 'pink';
}
