import React from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';

import * as xpromoActions from 'app/actions/xpromo';
import { XPROMO_SCROLLPAST, XPROMO_SCROLLUP } from 'lib/eventUtils';
import { xpromoThemeIsUsual, scrollPastState} from 'app/selectors/xpromo';
const T = React.PropTypes;

class XPromoWrapper extends React.Component {
  static propTypes = {
    recordXPromoShown: T.func.isRequired,
  };

  onScroll = () => {
    // For now we will consider scrolling half the viewport
    // "scrolling past" the interstitial.
    // note the referencing of window
    const { dispatch, alreadyScrolledPast, xpromoThemeIsUsual } = this.props;
    const halfViewport = (window.pageYOffset > window.innerHeight / 2);

    // should appears only once on scroll down about the half viewport.
    // "scrollPast" state is also used for 
    // toggling xpromo fade-in/fade-out actions
    if (halfViewport && !alreadyScrolledPast) {
      dispatch(xpromoActions.trackXPromoEvent(XPROMO_SCROLLPAST));
      dispatch(xpromoActions.promoScrollPast());
    }
    // should appears only once on scroll up about the half viewport.
    // xpromo fade-in action, if user will scroll
    // window up (only for "minimal" xpromo theme)
    if (!halfViewport && alreadyScrolledPast) {
      dispatch(xpromoActions.trackXPromoEvent(XPROMO_SCROLLUP));
      dispatch(xpromoActions.promoScrollUp());
    }
    // remove scroll events for usual xpromo theme 
    // (no needs to listen window up scrolling)
    if (alreadyScrolledPast && xpromoThemeIsUsual) {
      window.removeEventListener('scroll', this.onScroll);
    }
  }

  componentDidMount() {
    // Indicate that we've displayed a crosspromotional UI, 
    // so we don't keep showing them during this browsing session.
    this.props.recordXPromoShown();
    window.addEventListener('scroll', this.onScroll);
  }

  componentWillUnmount() {
    window.removeEventListener('scroll', this.onScroll);
  }

  render() {
    return this.props.children;
  }
}

const selector = createStructuredSelector({
  currentUrl: state => state.platform.currentPage.url,
  alreadyScrolledPast: state => scrollPastState(state),
  xpromoThemeIsUsual: state => xpromoThemeIsUsual(state),
});

const mergeProps = (stateProps, dispatchProps, ownProps) => ({
  ...stateProps,
  ...dispatchProps,
  recordXPromoShown: () =>
    dispatchProps.dispatch(xpromoActions.recordShown(stateProps.currentUrl)),
  ...ownProps,
});

export default connect(selector, undefined, mergeProps)(XPromoWrapper);
