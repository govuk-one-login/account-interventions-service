import fs from 'node:fs';
import path from 'node:path';

const testResultsFile = 'test-output-dynamo.json';
const basePath = path.join(process.cwd());
const filePath = path.join(basePath, testResultsFile);
const config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const { numPassedTests, numFailedTests } = config;

if (numPassedTests === 0 && numFailedTests === 0) {
  console.log(`No tests run`);
  process.exitCode = 1;
} else {
  console.log(`Test run successfully`);
}
