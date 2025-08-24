export const ALLOWED_CATEGORIES = [
  'missing',
  'extra',
  'empty',
  'mismatch',
  'duplicate',
  'gitignore',
] as const;

export type Category = (typeof ALLOWED_CATEGORIES)[number];

export type Options = {
  checkValues: boolean;
  isCiMode: boolean;
  isYesMode: boolean;
  allowDuplicates: boolean;
  fix: boolean;
  json: boolean;
  envFlag: string | null;
  exampleFlag: string | null;
  ignore: string[];
  ignoreRegex: RegExp[];
  cwd: string;
  only?: Category[];
  scanUsage: boolean;
  includeFiles: string[];
  excludeFiles: string[];
  showUnused: boolean;
  showStats: boolean;
  files?: string[];
};

export type RawOptions = {
  checkValues?: boolean;
  ci?: boolean;
  yes?: boolean;
  allowDuplicates?: boolean;
  fix?: boolean;
  json?: boolean;
  env?: string;
  example?: string;
  ignore?: string | string[];
  ignoreRegex?: string | string[];
  only?: string | string[];
  scanUsage?: boolean;
  includeFiles?: string | string[];
  excludeFiles?: string | string[];
  showUnused?: boolean;
  showStats?: boolean;
  files?: string | string[];
};

export type CompareJsonEntry = {
  env: string;
  example: string;
  skipped?: { reason: string };
  duplicates?: {
    env?: Array<{ key: string; count: number }>;
    example?: Array<{ key: string; count: number }>;
  };
  missing?: string[];
  extra?: string[];
  empty?: string[];
  valueMismatches?: Array<{ key: string; expected: string; actual: string }>;
  ok?: boolean;
};
