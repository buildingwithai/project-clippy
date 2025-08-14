export type VariableDef = { name: string; defaultValue?: string };

const VAR_REGEX = /\{\{\s*([a-zA-Z0-9_]+)(?::([^}]*))?\s*\}\}/g;

export function parseVariables(text?: string, html?: string): VariableDef[] {
  const seen = new Set<string>();
  const out: VariableDef[] = [];
  const scan = (s?: string) => {
    if (!s) return;
    let m: RegExpExecArray | null;
    VAR_REGEX.lastIndex = 0;
    while ((m = VAR_REGEX.exec(s))) {
      const name = m[1];
      const def = m[2];
      if (!seen.has(name)) {
        seen.add(name);
        out.push({ name, defaultValue: def });
      }
    }
  };
  scan(text);
  scan(html);
  return out;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function resolveVariables(
  input: { text?: string; html?: string },
  values: Record<string, string>
): { text?: string; html?: string } {
  const replaceFn = (_: string, name: string, def?: string) => {
    const v = values[name] ?? def ?? "";
    return v;
  };
  const replaceHtmlFn = (_: string, name: string, def?: string) => {
    const v = values[name] ?? def ?? "";
    return escapeHtml(v);
  };
  const out: { text?: string; html?: string } = {};
  if (typeof input.text === "string") {
    out.text = input.text.replace(VAR_REGEX, replaceFn);
  }
  if (typeof input.html === "string") {
    out.html = input.html.replace(VAR_REGEX, replaceHtmlFn);
  }
  return out;
}

export function hasUnresolvedVariables(values: Record<string, string>, defs: VariableDef[]): boolean {
  return defs.some(d => (values[d.name] ?? d.defaultValue ?? "").trim() === "");
}
