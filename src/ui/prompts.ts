import prompts from 'prompts';

/**
 * Prompt the user for a yes/no confirmation in interactive mode.
 * 
 * Behavior:
 * - If `isYesMode` is true → always returns true (auto-confirm).
 * - If `isCiMode` is true  → always returns false (non-interactive).
 * - Otherwise              → shows a prompt and waits for user input.
 * 
 * @param message The message to display to the user.
 * @returns A promise that resolves to `true` if the user confirmed, otherwise `false`.
 */
export async function confirmYesNo(
  message: string,
  { isCiMode, isYesMode }: { isCiMode: boolean; isYesMode: boolean },
): Promise<boolean> {
  if (isYesMode) return true;
  if (isCiMode) return false;
  const res = await prompts({
    type: 'select',
    name: 'ok',
    message,
    choices: [
      { title: 'Yes', value: true },
      { title: 'No', value: false },
    ],
    initial: 0,
  });
  return Boolean(res.ok);
}
