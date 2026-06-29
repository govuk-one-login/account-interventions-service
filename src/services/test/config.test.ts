import { transitionConfig } from '../account-states/config';
import { compareStrings } from '../account-states/account-state-engine';

const nodesValuesList = Object.values(transitionConfig.nodes);
const nodesKeysList = Object.keys(transitionConfig.nodes);
const edgesValuesList = Object.values(transitionConfig.edges);
const adjListKeys = Object.keys(transitionConfig.adjacency);

/**
 * These tests have been added as an extra safeguard against breaking changes being made to the Account State Engine configuration files
 * Some of those checks are performed already when the account state engine is instantiated
 * However, this file test file has been created to provide a quick way of testing changes made to the config file to see if they would break the engine
 * If you are making changes to the config file and these tests start failing please ensure you are comfortable with the changes being made
 */
describe('Tests for account state engine configuration file', () => {
  it('no two nodes should have the same values', () => {
    const hasDuplicates =
      new Set(nodesValuesList.map((stateDetail) => JSON.stringify(stateDetail))).size !== nodesValuesList.length;
    expect(hasDuplicates).toEqual(false);
  });
  it('each node should have one adjacency list', () => {
    expect(adjListKeys.length === nodesKeysList.length).toEqual(true);
    const isEquality =
      JSON.stringify(nodesKeysList.toSorted(compareStrings)) === JSON.stringify(adjListKeys.toSorted(compareStrings));
    expect(isEquality).toEqual(true);
  });
  it('each edge should point to an existing node', () => {
    let isAllEdgesPointToExistingNodes = true;
    for (const edge of edgesValuesList) {
      if (nodesKeysList.includes(edge.to)) continue;

      isAllEdgesPointToExistingNodes = false;
      break;
    }
    expect(isAllEdgesPointToExistingNodes).toEqual(true);
  });
});
