import './styles.less';

import React from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';

import { getDevice } from 'lib/getDeviceFromState';
import DualPartInterstitialHeader from 'app/components/DualPartInterstitial/Header';
import DualPartInterstitialFooter from 'app/components/DualPartInterstitial/Footer';
import XPromoWrapper from 'app/components/XPromoWrapper';
import { navigateToAppStore, promoClicked } from 'app/actions/xpromo';
import { xpromoThemeIsUsual, scrollPastState} from 'app/selectors/xpromo';

export function DualPartInterstitial(props) {
  const { scrollPast, xpromoThemeIsUsualState} = props;
  const classesName = ['DualPartInterstitial'];

  if (scrollPast) {
    classesName.push('fadeOut');
  }
  if (!xpromoThemeIsUsualState) {
    classesName.push('m-minimal');
  }

  return (
    <XPromoWrapper>
      <div className={ classesName.join(' ') }>
        <div className={ `${classesName[0]}__content` }>
          <div className={ `${classesName[0]}__common` }>
            <DualPartInterstitialHeader { ...props } />
            <DualPartInterstitialFooter { ...props } />
          </div>
        </div>
      </div>
    </XPromoWrapper>
  );
}

export const selector = createSelector(
  getDevice,
  scrollPastState,
  (state => xpromoThemeIsUsual(state)),
  (device, scrollPast, xpromoThemeIsUsualState) => ({ 
    device, 
    scrollPast, 
    xpromoThemeIsUsualState,
  }),
);

const mapDispatchToProps = dispatch => ({
  navigator: (url) => (() => {
    dispatch(promoClicked());
    dispatch(navigateToAppStore(url, 'interstitial_button'));
  }),
});

export default connect(selector, mapDispatchToProps)(DualPartInterstitial);
