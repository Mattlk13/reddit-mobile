import { find, some } from 'lodash';

import { flags as flagConstants, themes, xpromoDisplayTheme } from 'app/constants';
import features, { isNSFWPage } from 'app/featureFlags';
import getRouteMetaFromState from 'lib/getRouteMetaFromState';
import { getExperimentData } from 'lib/experiments';
import { getDevice, IPHONE, ANDROID } from 'lib/getDeviceFromState';

const { DAYMODE } = themes;
const { USUAL, MINIMAL } = xpromoDisplayTheme;

const {
  VARIANT_XPROMO_LOGIN_REQUIRED_IOS,
  VARIANT_XPROMO_LOGIN_REQUIRED_ANDROID,
  VARIANT_XPROMO_LOGIN_REQUIRED_IOS_CONTROL,
  VARIANT_XPROMO_LOGIN_REQUIRED_ANDROID_CONTROL,
  VARIANT_XPROMO_INTERSTITIAL_COMMENTS_IOS_TREATMENT,
  VARIANT_XPROMO_INTERSTITIAL_COMMENTS_ANDROID_TREATMENT,
  VARIANT_XPROMO_INTERSTITIAL_COMMENTS_IOS_CONTROL,
  VARIANT_XPROMO_INTERSTITIAL_COMMENTS_ANDROID_CONTROL,

} = flagConstants;

const EXPERIMENT_FULL = [
  VARIANT_XPROMO_LOGIN_REQUIRED_IOS,
  VARIANT_XPROMO_LOGIN_REQUIRED_ANDROID,
  VARIANT_XPROMO_LOGIN_REQUIRED_IOS_CONTROL,
  VARIANT_XPROMO_LOGIN_REQUIRED_ANDROID_CONTROL,
  VARIANT_XPROMO_INTERSTITIAL_COMMENTS_IOS_TREATMENT,
  VARIANT_XPROMO_INTERSTITIAL_COMMENTS_ANDROID_TREATMENT,
  VARIANT_XPROMO_INTERSTITIAL_COMMENTS_IOS_CONTROL,
  VARIANT_XPROMO_INTERSTITIAL_COMMENTS_ANDROID_CONTROL,
];

const EXPERIMENT_MOBILE = [
  VARIANT_XPROMO_LOGIN_REQUIRED_IOS,
  VARIANT_XPROMO_LOGIN_REQUIRED_ANDROID,
];

const EXPERIMENT_NAMES = {
  [VARIANT_XPROMO_LOGIN_REQUIRED_IOS]: 'mweb_xpromo_require_login_ios',
  [VARIANT_XPROMO_LOGIN_REQUIRED_ANDROID]: 'mweb_xpromo_require_login_android',
  [VARIANT_XPROMO_LOGIN_REQUIRED_IOS_CONTROL]: 'mweb_xpromo_require_login_ios',
  [VARIANT_XPROMO_LOGIN_REQUIRED_ANDROID_CONTROL]: 'mweb_xpromo_require_login_android',
  [VARIANT_XPROMO_INTERSTITIAL_COMMENTS_IOS_TREATMENT]: 'mweb_xpromo_interstitial_comments_ios_treatment',
  [VARIANT_XPROMO_INTERSTITIAL_COMMENTS_ANDROID_TREATMENT]: 'mweb_xpromo_interstitial_comments_android_treatment',
  [VARIANT_XPROMO_INTERSTITIAL_COMMENTS_IOS_CONTROL]: 'mweb_xpromo_interstitial_comments_ios_control',
  [VARIANT_XPROMO_INTERSTITIAL_COMMENTS_ANDROID_CONTROL]: 'mweb_xpromo_interstitial_comments_android_control',
};

function getRouteActionName(state) {
  const routeMeta = getRouteMetaFromState(state);
  const actionName = routeMeta && routeMeta.name;
  return actionName;
}

function isDayMode(state) {
  return (DAYMODE === state.theme);
}

function loginExperimentName(state) {
  if (!shouldShowXPromo(state)) {
    return null;
  }
  return xpromoIsPartOfExperiment(state);
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
  return xpromoTheme(state) === USUAL;
}

export function xpromoIsPastExperiment(state) {
  switch (xpromoTheme(state)) {
    case MINIMAL:
      return isPartOfXPromoExperiment(state);
    default: 
      return true;
  }
}

// @TODO: this should be controlled
// by FeatureFlags.js config only
export function xpromoIsEnabledOnPage(state) {
  const actionName = getRouteActionName(state);
  return actionName === 'index' 
    || (actionName === 'comments' && isDayMode(state) && !isNSFWPage(state))
    || (actionName === 'listing' && !isNSFWPage(state));
}

export function xpromoIsEnabledOnDevice(state) {
  const device = getDevice(state);
  // If we don't know what device we're on, then 
  // we should not match any list
  // of allowed devices.
  return (!!device) && [ANDROID, IPHONE].includes(device);
}

export function loginRequiredEnabled(state) {
  const featureContext = features.withContext({ state });
  const isExperimentEnabled = some(EXPERIMENT_MOBILE, feature => {
    return featureContext.enabled(feature);
  });
  return (
    shouldShowXPromo(state) &&
    state.user.loggedOut &&
    isExperimentEnabled
  );
}

export function scrollPastState(state) {
  return state.smartBanner.scrolledPast;
}

export function scrollStartState(state) {
  return state.smartBanner.scrolledStart;
}

export function shouldShowXPromo(state) {
  return state.smartBanner.showBanner &&
    xpromoIsEnabledOnPage(state) &&
    xpromoIsEnabledOnDevice(state);
}

export function interstitialType(state) {
  if (loginRequiredEnabled(state)) {
    return 'require_login';
  } else if (xpromoThemeIsUsual(state)) {
    return 'transparent';
  }
  return 'black_banner_fixed_bottom';
}

export function isPartOfXPromoExperiment(state) {
  return !!loginExperimentName(state);
}

export function currentExperimentData(state) {
  const experimentName = loginExperimentName(state);
  return getExperimentData(state, experimentName);
}
