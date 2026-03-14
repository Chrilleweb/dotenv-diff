#!/usr/bin/env node
import { createProgram } from '../src/cli/program.js';
import { run } from '../src/cli/run.js';

const program = createProgram();
run(program).catch((err) => {
  console.error(err?.message ?? err);
  process.exit(1);
});
