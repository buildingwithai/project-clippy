import { describe, it, expect } from 'vitest';
import { parseVariables, resolveVariables, hasUnresolvedVariables, type VariableDef } from './variables';

describe('variables utils', () => {
  it('parseVariables finds unique vars from text and html', () => {
    const text = 'Hello {{name}} from {{city:SF}}!';
    const html = '<p>Contact: {{email}}</p>';
    const defs = parseVariables(text, html);
    // Order should be first-seen across text then html
    expect(defs).toEqual<VariableDef[]>([
      { name: 'name', defaultValue: undefined },
      { name: 'city', defaultValue: 'SF' },
      { name: 'email', defaultValue: undefined },
    ]);
  });

  it('resolveVariables replaces with provided values and falls back to defaults', () => {
    const input = {
      text: 'Hello {{name}} from {{city:SF}}!',
      html: '<b>{{name}}</b> from <i>{{city:SF}}</i>',
    };
    const values = { name: 'Alex' };
    const out = resolveVariables(input, values);
    expect(out.text).toBe('Hello Alex from SF!');
    expect(out.html).toBe('<b>Alex</b> from <i>SF</i>');
  });

  it('resolveVariables escapes HTML values for html output only', () => {
    const input = {
      text: 'Plain {{val}}',
      html: '<div>{{val}}</div>',
    };
    const values = { val: '<script>alert(1)</script>' };
    const out = resolveVariables(input, values);
    expect(out.text).toBe('Plain <script>alert(1)</script>');
    expect(out.html).toBe('<div>&lt;script&gt;alert(1)&lt;/script&gt;</div>');
  });

  it('hasUnresolvedVariables detects when required values are empty', () => {
    const defs: VariableDef[] = [
      { name: 'a' },
      { name: 'b', defaultValue: 'x' },
      { name: 'c' },
    ];
    expect(hasUnresolvedVariables({ a: '1' }, defs)).toBe(true); // c missing
    expect(hasUnresolvedVariables({ a: '1', c: '3' }, defs)).toBe(false);
    expect(hasUnresolvedVariables({}, defs)).toBe(true); // a & c missing
  });

  it('parseVariables ignores duplicates and trims whitespace inside braces', () => {
    const text = 'Hi {{ name }} and {{name}} again';
    const defs = parseVariables(text);
    expect(defs).toEqual<VariableDef[]>([
      { name: 'name', defaultValue: undefined },
    ]);
  });
});
