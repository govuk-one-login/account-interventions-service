/* eslint-disable unicorn/text-encoding-identifier-case */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable unicorn/prefer-node-protocol */
/* eslint-disable @typescript-eslint/no-require-imports */

import { writeFileSync } from 'fs';

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const { readFileSync } = require('fs');

interface Mutant {
  status: string;
}

interface FileResult {
  mutants: Mutant[];
}

interface MutationReport {
  files: Record<string, FileResult>;
}

const report: MutationReport = JSON.parse(readFileSync('reports/mutation/mutation.json', 'utf-8'));

const survived = Object.values(report.files)
  .flatMap((f) => f.mutants)
  .filter((m) => m.status === 'Survived').length;

const outputFile = process.argv[2] ?? 'reports/mutation/mutation-condensed.json';
writeFileSync(outputFile, JSON.stringify({ survivingMutants: survived }));

console.log(`Wrote mutation testing artifact to ${outputFile}`);
