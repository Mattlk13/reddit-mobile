import { find, some } from 'lodash';

import { flags as flagConstants, themes, xpromoDisplayTheme } from 'app/constants';
import features from 'app/featureFlags';
import getSubreddit from 'lib/getSubredditFromState';
import getRouteMetaFromState from 'lib/getRouteMetaFromState';
import { getExperimentData } from 'lib/experiments';
import { getDevice, IPHONE, ANDROID } from 'lib/getDeviceFromState';

const { NIGHTMODE } = themes;
const { USUAL, MINIMAL } = xpromoDisplayTheme;

const {
  VARIANT_XPROMO_LOGIN_REQUIRED_IOS,
  VARIANT_XPROMO_LOGIN_REQUIRED_ANDROID,
  VARIANT_XPROMO_LOGIN_REQUIRED_IOS_CONTROL,
  VARIANT_XPROMO_LOGIN_REQUIRED_ANDROID_CONTROL,
  VARIANT_XPROMO_INTERSTITIAL_COMMENTS_CONTROL,
} = flagConstants;

const EXPERIMENT_FULL = [
  VARIANT_XPROMO_LOGIN_REQUIRED_IOS,
  VARIANT_XPROMO_LOGIN_REQUIRED_ANDROID,
  VARIANT_XPROMO_LOGIN_REQUIRED_IOS_CONTROL,
  VARIANT_XPROMO_LOGIN_REQUIRED_ANDROID_CONTROL,
  VARIANT_XPROMO_INTERSTITIAL_COMMENTS_CONTROL,
]

const EXPERIMENT_MOBILE = [
  VARIANT_XPROMO_LOGIN_REQUIRED_IOS,
  VARIANT_XPROMO_LOGIN_REQUIRED_ANDROID,
]

const EXPERIMENT_NAMES = {
  [VARIANT_XPROMO_LOGIN_REQUIRED_IOS]: 'mweb_xpromo_require_login_ios',
  [VARIANT_XPROMO_LOGIN_REQUIRED_ANDROID]: 'mweb_xpromo_require_login_android',
  [VARIANT_XPROMO_LOGIN_REQUIRED_IOS_CONTROL]: 'mweb_xpromo_require_login_ios',
  [VARIANT_XPROMO_LOGIN_REQUIRED_ANDROID_CONTROL]: 'mweb_xpromo_require_login_android',
  [VARIANT_XPROMO_INTERSTITIAL_COMMENTS_CONTROL]: 'mweb_xpromo_interstitial_comments',
};

function getRouteActionName(state) {
  const routeMeta = getRouteMetaFromState(state);
  const actionName = routeMeta && routeMeta.name;
  return actionName;
}

function isNSFWPage(state) {
  const { subreddits } = state;
  const subredditName = getSubreddit(state);

  if (!subredditName) {
    return true;
  }

  const subredditInfo = subreddits[subredditName.toLowerCase()];
  if (subredditInfo) {
    return subredditInfo.over18;
  }
  return true;
}

function isDayMode(state) {
  return (NIGHTMODE !== state.theme)
}

function loginExperimentName(state) {
  if (!shouldShowXPromo(state)) {
    return null;
  }
  return xpromoIsPartOfExperiment(state)
}

function xpromoIsPartOfExperiment(state) {
  const featureContext = features.withContext({ state });
  const featureFlag = find(EXPERIMENT_FULL, feature => {
    return featureContext.enabled(feature);
  });
  return featureFlag ? EXPERIMENT_NAMES[featureFlag] : null;
}

export function xpromoTheme(state) {
  switch (getRouteActionName(state)) {
    case 'comments':
      return MINIMAL;
    default: 
      return USUAL;
  }
}
export function xpromoThemeIsUsual(state) {
  return state.xpromoTheme === USUAL;
}

export function xpromoIsEnabledOnPage(state) {
  const actionName = getRouteActionName(state);
  return actionName === 'index' || (actionName === 'comments' && isDayMode(state)) || (actionName === 'listing' && !isNSFWPage(state));
}

export function xpromoIsEnabledOnDevice(state) {
  const device = getDevice(state);
  // If we don't know what device we're on, then 
  // we should not match any list
  // of allowed devices.
  return (!!device) && [ANDROID, IPHONE].includes(device);
}

export function xpromoIsPastExperiment(state) {
    switch (xpromoTheme(state)) {
    case MINIMAL:
      return isPartOfXPromoExperiment(state);
    default: 
      return true;
  }
}

export function loginRequiredEnabled(state) {
  const featureContext = features.withContext({ state });
  return (
    shouldShowXPromo(state) && state.user.loggedOut &&
    some(EXPERIMENT_MOBILE, feature => featureContext.enabled(feature))
  );
}

export function scrollPastState(state) {
  return state.smartBanner.scrolledPast;
}

export function shouldShowXPromo(state) {
  return state.smartBanner.showBanner &&
    xpromoIsEnabledOnPage(state) &&
    xpromoIsEnabledOnDevice(state) 
}

export function interstitialType(state) {
  if (loginRequiredEnabled(state)) {
    return 'require_login';
  }
  return 'transparent';
}

export function isPartOfXPromoExperiment(state) {
  return !!loginExperimentName(state);
}

export function currentExperimentData(state) {
  const experimentName = loginExperimentName(state);
  return getExperimentData(state, experimentName);
}
