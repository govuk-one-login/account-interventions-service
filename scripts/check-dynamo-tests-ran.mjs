import fs from 'node:fs';
import path from 'node:path';

const testResultsFile = 'test-output-dynamo.json';
const filePath = path.join(path.join(process.cwd()), testResultsFile);

try {
  const config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const { numPassedTests, numFailedTests } = config;
  const passed = numPassedTests ?? 0;
  const failed = numFailedTests ?? 0;

  if (passed === 0 && failed === 0) {
    console.log(`No tests run`);
    process.exitCode = 1;
  } else {
    console.log(`Test run successfully`);
  }
} catch (error) {
  console.log(`An error occurred: ${error}`);
  process.exitCode = 1;
}


fs.rmSync(filePath, { force: true });
