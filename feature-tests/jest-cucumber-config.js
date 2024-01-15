import { setJestCucumberConfiguration } from 'jest-cucumber';

setJestCucumberConfiguration({
  tagFilter: process.env.tagFilter,
  errorOnMissingScenariosAndSteps: false
});
