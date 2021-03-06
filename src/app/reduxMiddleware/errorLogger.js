import * as platformActions from '@r/platform/actions';
import { urlFromPage } from '@r/platform/pageUtils';
import config from 'config';
import errorLog from 'lib/errorLog';
import logSafeJSONStringify from 'lib/logSafeJSONStringify';
import RingStack from 'lib/RingStack';

import * as accountActions from 'app/actions/accounts';
import * as activityActions from 'app/actions/activities';
import * as adActions from 'app/actions/ads';
import * as commentActions from 'app/actions/comment';
import * as commentsPageActions from 'app/actions/commentsPage';
import * as hiddenActions from 'app/actions/hidden';
import * as mailActions from 'app/actions/mail';
import * as postActions from 'app/actions/posts';
import * as postsListActions from 'app/actions/postsList';
import * as preferenceActions from 'app/actions/preferences';
import * as savedActions from 'app/actions/saved';
import * as searchActions from 'app/actions/search';
import * as subredditActions from 'app/actions/subreddits';
import * as subscribedSubredditActions from 'app/actions/subscribedSubreddits';
import * as voteActions from 'app/actions/vote';
import * as wikiActions from 'app/actions/wiki';

export default function errorLogger() {
  const actionStack = new ActionStack(config.reduxActionLogSize, [
    platformActions.SET_PAGE,
    platformActions.NAVIGATE_TO_URL,
    platformActions.GOTO_PAGE_INDEX,
    accountActions.FETCHING_ACCOUNT,
    activityActions.FETCHING_ACTIVITIES,
    commentActions.MORE_COMMENTS_PENDING,
    commentsPageActions.FETCHING_COMMENTS_PAGE,
    hiddenActions.FETCHING_HIDDEN,
    mailActions.FETCHING,
    postsListActions.FETCHING_POSTS_LIST,
    savedActions.FETCHING_SAVED,
    searchActions.FETCHING_SEARCH_REQUEST,
    subredditActions.FETCHING_SUBREDDIT,
    wikiActions.FETCHING_WIKI,
  ]);

  return store => next => action => {
    actionStack.push(action);

    // Check for specific error actions, this gives insight into what kind of
    // error happened. I.E. its easier to differentiate between a specific
    // action or endpoint failing than seeing its equivalent stack trace.
    const error = checkForSpecificErrors(action);
    if (error) {
      logErrorWithConfig(error, store.getState(), actionStack);
    }

    // wrap the call of next(action) to catch any errors in reducers or middleware
    try {
      const result = next(action);

      if (result instanceof Promise) {
        // async actions all have an associated Promises. To catch errors in these
        // Promises we need to attach a .catch handler, otherwise they'll get
        // turned into PromiseRejectionEvents which are pretty different than Errors
        // (they don't even show up in window.onerror). This way we can catch
        // any unhandled exceptions in async actions here.
        // e.g. if we fetch some data and it parsed correctly, it could still
        // cause an error in reducers or React's rendering. both of those would
        // be caught here.
        result.catch(error => {
          // sometimes our catch handler is called twice with the same error object.
          // this isn't really understood but the hypothesis is it has something to do
          // with other .then handlers in the promise chain.
          // regardless, we set a `._SEEN_BY_REDUX_ERROR_LOGGER` property to
          // true to prevent duplicate logging
          let possibleDuplicate;
          if (!error._SEEN_BY_REDUX_ERROR_LOGGER) {
            try {
              error._SEEN_BY_REDUX_ERROR_LOGGER = true;
            } catch (e) {
              // this object is probably frozen and can't have properties set.
              // it could very well be a model from node-api-client.
              // or there's the extremely unlikely case that it already has
              // a readonly prop called `_SEEN_BY_REDUX_ERROR_LOGGER`....
              possibleDuplicate = true; // if we can't set this property
              // we can't de-dupe, so there's a chance it's a duplicate
            }
            logErrorWithConfig(error, store.getState(), actionStack, possibleDuplicate);
          }
        });
      }

      return result;
    } catch (error) {
      logErrorWithConfig(error, store.getState(), actionStack);
    }
  };
}

const checkForSpecificErrors = action => {
  switch (action.type) {
    case accountActions.FAILED:
    case activityActions.FAILED:
    case adActions.FAILED:
    case commentActions.MORE_COMMENTS_FAILURE:
    case commentActions.FAILED_UPDATE_BODY:
    case commentsPageActions.FAILED:
    case hiddenActions.FAILED:
    case mailActions.FAILED:
    case postActions.FAILED_UPDATE_SELF_TEXT:
    case postsListActions.FAILED:
    case preferenceActions.FAILED:
    case savedActions.FAILED:
    case searchActions.FAILED:
    case subredditActions.FAILED:
    case subscribedSubredditActions.FETCH_FAILED:
    case subscribedSubredditActions.TOGGLE_FAILED:
    case voteActions.FAILURE:
    case wikiActions.FAILED: {
      const { error } = action;
      if (error) {
        return error;
      }
    }
  }
};

const logErrorWithConfig = (error, state, actionStack, possibleDuplicate) => {
  const { meta: { userAgent }, platform: { currentPage } } = state;

  errorLog({
    error,
    userAgent,
    reduxInfo: actionStack.toString(),
    requestUrl: urlFromPage(currentPage),
    possibleDuplicate,
  }, {
    hivemind: config.statsURL,
    log: config.postErrorURL,
  });
};

// For more context in error logs we want to know the N most recent actions that
// passed through redux. Having all of the action objects would get big pretty
// fast so only track the type or 'name' of most actions. Some actions are
// useful to understand what's been happening in the app so we allow some
// configureable actions to be logged in their entirety.
class ActionStack {
  constructor(size, expandedInfoList=[]) {
    this.stack = new RingStack(size);
    this.expandedInfoList = new Set(expandedInfoList);
  }

  push(action) {
    // skip thunk'd actions
    if (typeof action === 'function') {
      return;
    }

    const storedAction = this.expandedInfoList.has(action.type) ? action : action.type;
    this.stack.push(storedAction);
  }

  // string representation of the action stack with most recent actions first.
  toString() {
    return `Redux Action Stack: ${this.stack.values().map(logSafeJSONStringify).join(', ')}`;
  }
}
