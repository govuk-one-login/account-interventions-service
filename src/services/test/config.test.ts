import {transitionConfiguration} from "../account-states/config";
import {compareStrings} from "../account-states/account-state-engine";

const nodesValuesList = Object.values(transitionConfiguration.nodes);
const nodesKeysList = Object.keys(transitionConfiguration.nodes);
const edgesValuesList = Object.values(transitionConfiguration.edges);
const adjListKeys = Object.keys(transitionConfiguration.adjacency);

/**
 * These tests have been added as an extra safeguard against breaking changes being made to the Account State Engine configuration files
 * Some of those checks are performed already when the account state engine is instantiated
 * However, this file test file has been created to provide a quick way of testing changes made to the config file to see if they would break the engine
 * If you are making changes to the config file and these tests start failing please ensure you are comfortable with the changes being made
 */
describe('Tests for account state engine configuration file', () => {
  it('no two nodes should have the same values', () => {
    const hasDuplicates = (new Set(nodesValuesList.map((e) => JSON.stringify(e)))).size !== nodesValuesList.length
    expect(hasDuplicates).toEqual(false)

  })
  it('each node should have one adjacency list', () => {
    expect(adjListKeys.length === nodesKeysList.length).toEqual(true);
    const equality = JSON.stringify(nodesKeysList.sort(compareStrings)) === JSON.stringify(adjListKeys.sort((compareStrings)));
    expect(equality).toEqual(true);
  })
  it('each edge should point to an existing node', () => {
    let allEdgesPointToExistingNodes = true;
    for (const edge of edgesValuesList){
      if (!nodesKeysList.includes(edge.to)){
        allEdgesPointToExistingNodes = false;
        break;
      }
    }
    expect(allEdgesPointToExistingNodes).toEqual(true);
  })
})
