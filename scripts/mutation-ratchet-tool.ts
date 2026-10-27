/* eslint-disable unicorn/text-encoding-identifier-case */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable unicorn/prefer-node-protocol */
/* eslint-disable @typescript-eslint/no-require-imports */

import { writeFileSync, readFileSync } from 'fs';
import { Command } from 'commander';
import { z } from 'zod';
import { exit } from 'process';

const mutationRatchetCli = new Command();

mutationRatchetCli
  .option(
    '-i, --inputFile <char>',
    'Location of the mutation testing report to use',
    'reports/mutation/mutation.json'
  )
  .option(
    '-o, --outputFile <char>',
    'Location to write the mutation score file to. Cannot be the same as --compareToFile',
  )
  .option(
    '-c, --compareToFile <char>',
    'Location of file to compare the score to'
  )
  .option(
    '-f, --force',
    'Whether to force overwrite the output ratchet score file'
  );

mutationRatchetCli.parse();

const fileResultParser = z.object({
  mutants: z.array(
    z.object({
      status: z.string()
    })
  )
});

const mutationReportParser = z.object({
  files: z.record(z.string(), fileResultParser)
});

const scoreParser = z.number();

const options = mutationRatchetCli.opts();

try {
  if (options['outputFile'] == options['compareToFile']) {
    if (options['outputFile'] === undefined) {
      throw new Error(
        'At least one of outputFile and compareToFile must be set.'
      )
    }
    throw new Error('outputFile and compareToFile must be different');
  }

  const report = mutationReportParser.parse(
    JSON.parse(readFileSync(options['inputFile'], 'utf-8'))
  );

  const newScore = Object.values(report.files)
    .flatMap((f) => f.mutants)
    .filter((m) => m.status === 'Survived').length;

  if (options['outputFile'] !== undefined) {
    const outputFile = options['outputFile'];
    const currentScore = scoreParser.parse(
      JSON.parse(readFileSync(options['outputFile'], 'utf-8'))
    );
    if (currentScore < newScore && !options['force']) {
      throw new Error(`Failed to update ratchet - new score (${newScore}) is higher than old score (${currentScore}). Use --force if you still want to update the ratchet file.`);
    }
    writeFileSync(outputFile, JSON.stringify(newScore));

    console.log(`Wrote mutation testing artifact to ${outputFile}`);
  }

  if (options['compareToFile'] !== undefined) {
    const currentScore = scoreParser.parse(
      JSON.parse(readFileSync(options['compareToFile'], 'utf-8'))
    );
    if (currentScore < newScore) {
      throw new Error(`Ratchet check failed - new score (${newScore}) is higher than old score (${currentScore}). Fix the added issues or mark them as ignored.`);
    }
    if (currentScore > newScore) {
      throw new Error(`Ratchet check failed - new score (${newScore}) is lower than old score (${currentScore}). Update the ratchet score using \`npm run test:mutation:update-ratchet\` and commit the file change.`);
    } else {
      console.log('Ratchet check succeeded - new score is equal to old score.');
    }
  }
} catch (error) {
  console.log(`Failed with ${error}`);
  exit(1);
}
