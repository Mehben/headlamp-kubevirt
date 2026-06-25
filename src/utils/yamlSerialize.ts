/** Simple JSON-to-YAML serializer for K8s resource preview. No external deps. */
export function toYaml(obj: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj === 'boolean') return String(obj);
  if (typeof obj === 'number') return String(obj);
  if (typeof obj === 'string') {
    if (obj === '') return '""';
    // Quote if it contains special chars or looks like a number/bool
    if (/[:{}\[\],&*?|>!%@`#]/.test(obj) || /^(true|false|null|yes|no)$/i.test(obj) || /^\d/.test(obj)) {
      return `"${obj.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return obj
      .map(item => {
        const val = toYaml(item, indent + 1);
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          // Object array items: put first key on same line as dash
          const lines = val.trimStart().split('\n');
          return `${pad}- ${lines[0]}\n${lines.slice(1).map(l => `${pad}  ${l}`).join('\n')}`.trimEnd();
        }
        return `${pad}- ${val}`;
      })
      .join('\n');
  }
  if (typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>).filter(
      ([, v]) => v !== undefined
    );
    if (entries.length === 0) return '{}';
    return entries
      .map(([key, val]) => {
        if (typeof val === 'object' && val !== null) {
          const nested = toYaml(val, indent + 1);
          return `${pad}${key}:\n${nested}`;
        }
        return `${pad}${key}: ${toYaml(val, indent + 1)}`;
      })
      .join('\n');
  }
  return String(obj);
}
