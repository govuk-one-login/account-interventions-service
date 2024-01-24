const setJestCucumberConfiguration = require('jest-cucumber').setJestCucumberConfiguration;

setJestCucumberConfiguration({
  tagFilter: process.env.tagFilter,
  errorOnMissingScenariosAndSteps: false
});
