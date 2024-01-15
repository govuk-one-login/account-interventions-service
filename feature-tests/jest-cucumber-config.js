import { setJestCucumberConfiguration } from 'jest-cucumber';

setJestCucumberConfiguration({
  tagFilter: '@smoke',
});
