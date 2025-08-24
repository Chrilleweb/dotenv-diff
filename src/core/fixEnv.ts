import fs from 'fs';

export function applyFixes({
  envPath,
  examplePath,
  missingKeys,
  duplicateKeys,
}: {
  envPath: string;
  examplePath: string;
  missingKeys: string[];
  duplicateKeys: string[];
}) {
  const result = {
    removedDuplicates: [] as string[],
    addedEnv: [] as string[],
    addedExample: [] as string[],
  };

  // --- Remove duplicates ---
  if (duplicateKeys.length) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    const seen = new Set<string>();
    const newLines: string[] = [];
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      const match = line.match(/^\s*([\w.-]+)\s*=/);
      if (match) {
        const key = match[1];
        if (duplicateKeys.includes(key)) {
          if (seen.has(key)) continue; // skip duplicate
          seen.add(key);
        }
      }
      newLines.unshift(line);
    }
    fs.writeFileSync(envPath, newLines.join('\n'));
    result.removedDuplicates = duplicateKeys; // save all dupe keys
  }

  // --- Add missing keys to .env ---
  if (missingKeys.length) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const newContent =
      content +
      (content.endsWith('\n') ? '' : '\n') +
      missingKeys.map((k) => `${k}=`).join('\n') +
      '\n';
    fs.writeFileSync(envPath, newContent);
    result.addedEnv = missingKeys; // save all missing keys
  }

  // --- Add missing keys to .env.example ---
  if (examplePath && missingKeys.length) {
    const exContent = fs.readFileSync(examplePath, 'utf-8');
    const existingExKeys = new Set(
      exContent
        .split('\n')
        .map((l) => l.trim().split('=')[0])
        .filter(Boolean),
    );
    const newExampleKeys = missingKeys.filter((k) => !existingExKeys.has(k));
    if (newExampleKeys.length) {
      const newExContent =
        exContent +
        (exContent.endsWith('\n') ? '' : '\n') +
        newExampleKeys.join('\n') +
        '\n';
      fs.writeFileSync(examplePath, newExContent);
      result.addedExample = newExampleKeys; // save all keys actually added
    }
  }

  const changed =
    result.removedDuplicates.length > 0 ||
    result.addedEnv.length > 0 ||
    result.addedExample.length > 0;

  return { changed, result };
}
