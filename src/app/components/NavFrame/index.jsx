import './styles.less';
import React from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';

import DualPartInterstitial from 'app/components/DualPartInterstitial';
import EUCookieNotice from 'app/components/EUCookieNotice';
import TopNav from 'app/components/TopNav';
import { shouldShowXPromo, loginRequiredEnabled as loginRequiredXPromoVariant } from 'app/selectors/xpromo';

const themeSelector = state => state.theme;

const xPromoSelector = createSelector(
  shouldShowXPromo,
  loginRequiredXPromoVariant,
  themeSelector,
  (showXPromo, requireLogin, theme) => {
    return { showXPromo, requireLogin, theme};
  },
);

const NavFrame = props => {
  const { children, requireLogin, showXPromo } = props;

  console.error('>>>>', props)

  let belowXPromo = null;
  if (!requireLogin) {
    belowXPromo = (
      <div>
        <TopNav />
        <div className='NavFrame__below-top-nav'>
          <EUCookieNotice />
          { children }
        </div>
      </div>
    );
  }

  return (
    <div className='NavFrame'>
      { showXPromo ? <DualPartInterstitial>{ children }</DualPartInterstitial> : null }
      { belowXPromo }
    </div>
  );
};

export default connect(xPromoSelector)(NavFrame);
