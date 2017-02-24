import mergeAPIModels from './helpers/mergeAPIModels';
import * as loginActions from 'app/actions/login';
import * as accountActions from 'app/actions/accounts';

import Account from 'apiClient/models/Account';

const DEFAULT = {};

const EXPERIMENT_REGEXP = /^experiment_/;
const INIT_ACTION = '@@redux/INIT';
const DEV_TOOLS_INIT = '@@INIT';

export default (platformInitialCurrentPage={}) => {
  let FAKE_EXPERIMENT_ID = 9999;

  const experimentOverrides = Object
    .keys(platformInitialCurrentPage.queryParams || {})
    .reduce((result, queryParam) => {
      if (queryParam.match(EXPERIMENT_REGEXP)) {
        result[queryParam.replace(EXPERIMENT_REGEXP, '')] = {
          owner: 'experiment_override',
          variant: platformInitialCurrentPage.queryParams[queryParam],
          experiment_id: FAKE_EXPERIMENT_ID--,
        };
      }

      return result;
    }, {});

  // console.log('overrides', experimentOverrides);

  const applyExperimentOverrides = state => (Object
    .keys(state)
    .reduce((result, accountName) => {
      const account = state[accountName];
      result[accountName] = account.set({
        features: {
          ...(account.features || {}),
          ...experimentOverrides,
        },
      });
      return result;
    }, {}));

  const activateModels = models => (Object
    .keys(models)
    .reduce((result, accountName) => {
      result[accountName] = Account.fromJSON(models[accountName]);
      return result;
    }, {}));

  return function(state=DEFAULT, action={}) {
    switch (action.type) {
      case loginActions.LOGGED_IN:
      case loginActions.LOGGED_OUT: {
        return DEFAULT;
      }

      // on client bootstrap, we need to overrdie whatever came in from the server
      // accounts come in as JSON, so we need to deserialize them
      case DEV_TOOLS_INIT:
      case INIT_ACTION: {
        return applyExperimentOverrides(activateModels(state));
      }

      case accountActions.RECEIVED_ACCOUNT: {
        let { accounts } = action.apiResponse;
        accounts = applyExperimentOverrides(accounts);

        return mergeAPIModels(state, accounts);
      }

      default: return state;
    }
  };
};
