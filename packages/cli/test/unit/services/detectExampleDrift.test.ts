import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { detectExampleDrift } from '../../../src/services/detectExampleDrift.js';

describe('detectExampleDrift', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-unit-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const write = (name: string, content: string): string => {
    const file = path.join(dir, name);
    fs.writeFileSync(file, content);
    return file;
  };

  /**
   * Runs the detector as the scan would, i.e. against the file the scan picked.
   * Defaults to `.env`, the usual auto-discovery winner.
   */
  const run = (
    comparisonFile = '.env',
    ignore: string[] = [],
    ignoreRegex: RegExp[] = [],
  ) =>
    detectExampleDrift({
      comparisonPath: path.join(dir, comparisonFile),
      ignore,
      ignoreRegex,
    });

  const keys = (
    comparisonFile = '.env',
    ignore: string[] = [],
    ignoreRegex: RegExp[] = [],
  ) => run(comparisonFile, ignore, ignoreRegex).map((w) => w.key);

  it('reports keys set in .env but absent from .env.example', () => {
    write('.env', 'DB_URL=postgres://x\nSTRIPE_SECRET=sk_test\n');
    write('.env.example', 'DB_URL=\n');

    expect(run()).toEqual([
      {
        key: 'STRIPE_SECRET',
        envFile: '.env',
        exampleFile: '.env.example',
      },
    ]);
  });

  it('returns nothing when both files document the same keys', () => {
    write('.env', 'DB_URL=postgres://x\nAPI_KEY=abc\n');
    write('.env.example', 'API_KEY=\nDB_URL=\n');

    expect(run()).toEqual([]);
  });

  it('does not report keys documented in the example but unset in .env', () => {
    // One-directional on purpose: that direction is what --compare is for.
    write('.env', 'DB_URL=postgres://x\n');
    write('.env.example', 'DB_URL=\nOPTIONAL_KEY=\n');

    expect(run()).toEqual([]);
  });

  it('keeps the order the keys appear in the env file', () => {
    write('.env', 'Z_KEY=1\nA_KEY=2\nM_KEY=3\n');
    write('.env.example', '');

    expect(keys()).toEqual(['Z_KEY', 'A_KEY', 'M_KEY']);
  });

  it('returns nothing when there is no example file to drift from', () => {
    write('.env', 'API_KEY=x\n');

    expect(run()).toEqual([]);
  });

  it('returns nothing when the directory holds only an example file', () => {
    write('.env.example', 'API_KEY=\n');

    expect(run('.env.example')).toEqual([]);
  });

  it('returns nothing for an unreadable directory', () => {
    expect(
      detectExampleDrift({
        comparisonPath: path.join(dir, 'nope', '.env.example'),
        ignore: [],
        ignoreRegex: [],
      }),
    ).toEqual([]);
  });

  it('yields no warnings when the env file cannot be read', () => {
    // A directory where a file is expected. Drift is advisory, so an unreadable
    // file must degrade to "nothing to report" rather than break the scan.
    fs.mkdirSync(path.join(dir, '.env'));
    write('.env.example', 'API_KEY=\n');

    expect(run()).toEqual([]);
  });

  describe('only the scanned env file', () => {
    it('reports .env alone when the scan compared against .env', () => {
      write('.env', 'ROOT_ONLY=1\n');
      write('.env.local', 'LOCAL_ONLY=1\n');
      write('.env.example', '');

      expect(run('.env')).toEqual([
        { key: 'ROOT_ONLY', envFile: '.env', exampleFile: '.env.example' },
      ]);
    });

    it('reports .env.local alone when the scan compared against it', () => {
      write('.env', 'ROOT_ONLY=1\n');
      write('.env.local', 'LOCAL_ONLY=1\n');
      write('.env.example', '');

      expect(run('.env.local')).toEqual([
        {
          key: 'LOCAL_ONLY',
          envFile: '.env.local',
          exampleFile: '.env.example',
        },
      ]);
    });

    it('falls back to the env file beside an example comparison file', () => {
      // With no .env present the scan compares against .env.example itself;
      // .env.local is what the project actually runs on, so check that.
      write('.env.local', 'DB_URL=x\nLOCAL_ONLY=1\n');
      write('.env.example', 'DB_URL=\n');

      expect(run('.env.example')).toEqual([
        {
          key: 'LOCAL_ONLY',
          envFile: '.env.local',
          exampleFile: '.env.example',
        },
      ]);
    });

    it('prefers .env when falling back', () => {
      write('.env', 'ROOT_ONLY=1\n');
      write('.env.local', 'LOCAL_ONLY=1\n');
      write('.env.example', '');

      expect(run('.env.example')).toEqual([
        { key: 'ROOT_ONLY', envFile: '.env', exampleFile: '.env.example' },
      ]);
    });

    it('ignores .envrc and other names that merely start with .env', () => {
      // direnv's .envrc is a shell script, not a dotenv file.
      write('.env.example', '');
      write('.envrc', 'export SHELL_KEY=1\n');
      write('.environment', 'OTHER=1\n');

      expect(run('.env.example')).toEqual([]);
    });

    it('never falls back to another example file', () => {
      write('.env.example', 'DOCUMENTED=\n');
      write('.env.sample', 'ALSO_DOCUMENTED=\n');
      write('.env.example.production', 'PROD_DOC=\n');

      expect(run('.env.example')).toEqual([]);
    });
  });

  describe('optional keys', () => {
    it('does not report a key marked @optional in the env file', () => {
      write('.env', 'API_KEY=x\n# @optional\nDEBUG_TOKEN=y\n');
      write('.env.example', '');

      expect(keys()).toEqual(['API_KEY']);
    });

    it('accepts the other annotation styles', () => {
      write('.env', '// optional\nA=1\n#@optional\nB=2\n@optional\nC=3\n');
      write('.env.example', '');

      expect(run()).toEqual([]);
    });

    it('still reports keys below a blank line after the annotation', () => {
      // A blank line ends the block, so the annotation cannot leak downwards.
      write('.env', '# @optional\n\nAPI_KEY=x\n');
      write('.env.example', '');

      expect(keys()).toEqual(['API_KEY']);
    });

    it('needs no handling for @optional on the example side', () => {
      // A key written in the example is documented whatever its annotations,
      // so it can never drift in the first place.
      write('.env', 'REDIS_URL=x\n');
      write('.env.example', '# @optional\nREDIS_URL=\n');

      expect(run()).toEqual([]);
    });
  });

  describe('example file resolution', () => {
    it.each(['.env-example', '.env.sample', '.env.template'])(
      'pairs .env.local with %s',
      (exampleName) => {
        write('.env.local', 'LOCAL_ONLY=1\n');
        write(exampleName, '');

        expect(run('.env.local')).toEqual([
          {
            key: 'LOCAL_ONLY',
            envFile: '.env.local',
            exampleFile: exampleName,
          },
        ]);
      },
    );

    it('prefers .env.example when several example files exist', () => {
      write('.env', 'API_KEY=x\n');
      write('.env.sample', '');
      write('.env.example', 'API_KEY=\n');

      expect(run()).toEqual([]);
    });

    it('prefers the suffix-matched example, as --compare does', () => {
      write('.env.production', 'PROD_KEY=1\n');
      write('.env.example', '');
      write('.env.example.production', 'PROD_KEY=\n');

      expect(run('.env.production')).toEqual([]);
    });

    it('falls back to the unsuffixed example when no suffixed one exists', () => {
      write('.env.production', 'PROD_KEY=1\nEXTRA=2\n');
      write('.env.example', 'PROD_KEY=\n');

      expect(run('.env.production')).toEqual([
        {
          key: 'EXTRA',
          envFile: '.env.production',
          exampleFile: '.env.example',
        },
      ]);
    });
  });

  describe('ignored keys', () => {
    it('excludes keys listed in --ignore', () => {
      write('.env', 'API_KEY=x\nDEBUG_TOKEN=y\n');
      write('.env.example', '');

      expect(keys('.env', ['DEBUG_TOKEN'])).toEqual(['API_KEY']);
    });

    it('excludes keys matching --ignore-regex', () => {
      write('.env', 'API_KEY=x\nTEST_A=1\nTEST_B=2\n');
      write('.env.example', '');

      expect(keys('.env', [], [/^TEST_/])).toEqual(['API_KEY']);
    });

    it('excludes built-in defaults that never belong in an example file', () => {
      write('.env', 'NODE_ENV=development\nAPI_KEY=x\n');
      write('.env.example', '');

      expect(keys()).toEqual(['API_KEY']);
    });
  });
});
