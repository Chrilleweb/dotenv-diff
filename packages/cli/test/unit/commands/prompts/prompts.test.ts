import { describe, it, expect, vi, beforeEach } from 'vitest';
import prompts from 'prompts';
import { confirmYesNo } from '../../../../src/commands/prompts/prompts.js';

vi.mock('prompts');

const mockPrompts = prompts as unknown as ReturnType<typeof vi.fn>;

function setTTY(stdinTTY: boolean, stdoutTTY: boolean): void {
  Object.defineProperty(process.stdin, 'isTTY', {
    value: stdinTTY,
    configurable: true,
  });
  Object.defineProperty(process.stdout, 'isTTY', {
    value: stdoutTTY,
    configurable: true,
  });
}

describe('confirmYesNo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when isYesMode is true (auto-confirm)', async () => {
    const result = await confirmYesNo('Are you sure?', {
      isCiMode: false,
      isYesMode: true,
    });

    expect(result).toBe(true);
    expect(mockPrompts).not.toHaveBeenCalled();
  });

  it('returns false when isCiMode is true (non-interactive)', async () => {
    const result = await confirmYesNo('Are you sure?', {
      isCiMode: true,
      isYesMode: false,
    });

    expect(result).toBe(false);
    expect(mockPrompts).not.toHaveBeenCalled();
  });

  it('returns true when user selects Yes', async () => {
    setTTY(true, true);
    mockPrompts.mockResolvedValue({ ok: true });

    const result = await confirmYesNo('Are you sure?', {
      isCiMode: false,
      isYesMode: false,
    });

    expect(result).toBe(true);
    expect(mockPrompts).toHaveBeenCalledOnce();
  });

  it('returns false when user selects No', async () => {
    setTTY(true, true);
    mockPrompts.mockResolvedValue({ ok: false });

    const result = await confirmYesNo('Are you sure?', {
      isCiMode: false,
      isYesMode: false,
    });

    expect(result).toBe(false);
    expect(mockPrompts).toHaveBeenCalledOnce();
  });

  it('returns false when prompt returns undefined', async () => {
    setTTY(true, true);
    mockPrompts.mockResolvedValue({});

    const result = await confirmYesNo('Are you sure?', {
      isCiMode: false,
      isYesMode: false,
    });

    expect(result).toBe(false);
  });

  it('returns false when no TTY is available and does not prompt', async () => {
    setTTY(false, false);

    const result = await confirmYesNo('Are you sure?', {
      isCiMode: false,
      isYesMode: false,
    });

    expect(result).toBe(false);
    expect(mockPrompts).not.toHaveBeenCalled();
  });
});
