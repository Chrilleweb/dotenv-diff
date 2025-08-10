import prompts from 'prompts';

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
