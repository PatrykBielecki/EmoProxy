/**
 * Parses a JSON keyframes definition into a CSS keyframes body string.
 *
 * The JSON format is: `{ "0%": { "transform": "scale(1)" }, "100%": { "transform": "scale(1.2)" } }`
 *
 * Returns `null` when the input is empty, invalid JSON, or contains no steps.
 */
export function parseKeyframesJson(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const parsed = JSON.parse(value) as Record<string, Record<string, string | number>>;
    const keys = Object.keys(parsed);
    if (!keys.length) return null;
    return keys
      .map((step) => {
        const properties = parsed[step];
        const body = Object.entries(properties)
          .map(([property, propertyValue]) => `${property}:${String(propertyValue)};`)
          .join('');
        return `${step}{${body}}`;
      })
      .join('');
  } catch {
    return null;
  }
}

/**
 * Parses a JSON keyframes definition and returns both the CSS string and validation state.
 * Useful for admin previews that need to display error messages.
 */
export function parseKeyframesJsonWithValidation(
  raw: string | null | undefined
): { css: string; valid: boolean; error?: string } {
  if (!raw?.trim()) return { css: '', valid: true };
  try {
    const parsed = JSON.parse(raw) as Record<string, Record<string, string | number>>;
    const steps = Object.keys(parsed);
    if (!steps.length) return { css: '', valid: false, error: 'Keyframes JSON must include at least one step.' };
    const css = steps
      .map((step) => {
        const props = parsed[step];
        const body = Object.entries(props)
          .map(([k, v]) => `${k}:${String(v)};`)
          .join('');
        return `${step}{${body}}`;
      })
      .join('');
    return { css, valid: true };
  } catch {
    return { css: '', valid: false, error: 'Invalid JSON format.' };
  }
}
