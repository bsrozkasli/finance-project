import { describe, expect, it } from 'vitest';

const sources = import.meta.glob('../**/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function findUntypedButtons(source: string): number[] {
  const lines: number[] = [];
  const startPattern = /<button(?=[\s>/])/g;
  let match: RegExpExecArray | null;
  while ((match = startPattern.exec(source)) !== null) {
    let depth = 0;
    let end = source.length;
    for (let i = match.index + match[0].length; i < source.length; i++) {
      const ch = source[i];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      else if (ch === '>' && depth === 0) {
        end = i;
        break;
      }
    }
    const tag = source.slice(match.index, end);
    if (!/(^|\s)type\s*=/.test(tag)) {
      lines.push(source.slice(0, match.index).split('\n').length);
    }
  }
  return lines;
}

describe('button type guard', () => {
  it('every <button> in src declares an explicit type', () => {
    const offenders: string[] = [];
    for (const [path, source] of Object.entries(sources)) {
      if (path.includes('.test.')) continue;
      for (const line of findUntypedButtons(source)) {
        offenders.push(`${path}:${line}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
