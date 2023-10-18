import { StateDetails } from '../../constants';

// the state parameter is an object containing the information from dynamoDB
export function buildStateClass(state: StateDetails) {
  console.log(state);

  // can we do ajv validation to catch combination of flags that aren't expected?

  if (state.blocked) {
    console.log('current state is blocked');
  } else if (state.suspended === false) {
    console.log('current state is unsuspended no user action');
  } else {
    if (state.reproveIdentity && state.resetPassword) {
      console.log('current state is suspended psw and id reset required');
    } else if (state.reproveIdentity) {
      console.log('current state is suspended id reset (only) required');
    } else if (state.resetPassword) {
      console.log('current state is suspended pws reset (only) required');
    } else {
      console.log('current state is no intervention on record');
    }
  }
}
