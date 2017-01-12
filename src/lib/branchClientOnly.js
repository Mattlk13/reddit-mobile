import branch from 'branch-sdk';

import config from 'config';
import { STATIC_BRANCH_FIELDS, generateDynamicFields } from 'lib/branch';

export async function hasMobileApp() {
  return new Promise((resolve) => {
    branch.init(config.branchKey, (err, data) => {
      if (err) {
        // just ignore the error and say they don't have the app.
        resolve(false);
      }
      resolve(data.has_app);
    })
  })
}

export function generateBranchLink(getState) {
  // branch.init is idempotent so we can call this safely over and over.
  branch.init(config.branchKey);
  // note that branch queues up all api requests until after the init call is finished.
  // this means we don't have to manually await the finishing of branch.init before we
  // call branch.link.
  return new Promise((resolve) => {
    branch.link(
      { ...STATIC_BRANCH_FIELDS, data: generateDynamicFields(getState()) },
      (err, link) => {
        // we prefer to have the branch server make these links for us.
        // if something bad happens, we can still make our own.
        if (err) {
          resolve(generateBranchLink(getState()));
        }
        resolve(link);
      }
    )
  });
}
