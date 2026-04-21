/**
  This Stryker plugin automatically ignores calls to log functions when mutation testing.
  It's adapted from an example in the Stryker docs: https://stryker-mutator.io/docs/stryker-js/disable-mutants/#using-an-ignore-plugin
*/

import { PluginKind, declareValuePlugin } from '@stryker-mutator/api/plugin';

const logFunctionLevels = new Set(['trace', 'debug', 'info', 'warn', 'error'])

export const strykerPlugins = [
  declareValuePlugin(PluginKind.Ignore, 'logger', {
    shouldIgnore(path) {
      // Define the conditions for which you want to ignore mutants
      if (
        path.isExpressionStatement() &&
        path.node.expression.type === 'CallExpression' &&
        path.node.expression.callee.type === 'MemberExpression' &&
        path.node.expression.callee.object.type === 'Identifier' &&
        path.node.expression.callee.object.name === 'logger' &&
        path.node.expression.callee.property.type === 'Identifier' &&
        logFunctionLevels.has(path.node.expression.callee.property.name)
      ) {
        // Return the ignore reason
        return "We're not interested in testing log statements, see ADR 002.";
      }
    },
  }),
];
