import { describe, it, expect } from 'vitest';
import { toUpperSnakeCase } from '../../../../src/core/helpers/toUpperSnakeCase.js';

describe('toUpperSnakeCase', () => {
  it('converts camelCase to UPPER_SNAKE_CASE', () => {
    expect(toUpperSnakeCase('myVariableName')).toBe('MY_VARIABLE_NAME');
  });

  it('converts PascalCase to UPPER_SNAKE_CASE', () => {
    expect(toUpperSnakeCase('MyVariableName')).toBe('MY_VARIABLE_NAME');
  });

  it('converts kebab-case to UPPER_SNAKE_CASE', () => {
    expect(toUpperSnakeCase('my-variable-name')).toBe('MY_VARIABLE_NAME');
  });

  it('converts spaces to underscores', () => {
    expect(toUpperSnakeCase('my variable name')).toBe('MY_VARIABLE_NAME');
  });

  it('handles already UPPER_SNAKE_CASE', () => {
    expect(toUpperSnakeCase('MY_VARIABLE_NAME')).toBe('MY_VARIABLE_NAME');
  });

  it('handles lowercase_snake_case', () => {
    expect(toUpperSnakeCase('my_variable_name')).toBe('MY_VARIABLE_NAME');
  });

  it('handles mixed case with numbers', () => {
    expect(toUpperSnakeCase('myVar123Name')).toBe('MY_VAR123_NAME');
  });

  it('handles consecutive uppercase letters (acronyms stay together)', () => {
    expect(toUpperSnakeCase('URLParser')).toBe('URLPARSER');
  });

  it('handles mixed separators', () => {
    expect(toUpperSnakeCase('my-variable name_test')).toBe(
      'MY_VARIABLE_NAME_TEST',
    );
  });

  it('handles single word', () => {
    expect(toUpperSnakeCase('variable')).toBe('VARIABLE');
  });

  it('handles empty string', () => {
    expect(toUpperSnakeCase('')).toBe('');
  });

  it('handles single character', () => {
    expect(toUpperSnakeCase('a')).toBe('A');
  });

  it('handles multiple consecutive dashes', () => {
    expect(toUpperSnakeCase('my---variable')).toBe('MY_VARIABLE');
  });

  it('handles multiple consecutive spaces', () => {
    expect(toUpperSnakeCase('my   variable')).toBe('MY_VARIABLE');
  });
});
