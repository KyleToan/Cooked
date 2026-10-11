import { useCallback } from 'react';
import { LayoutAnimation } from 'react-native';

import { useReducedMotion } from './useReducedMotion';

/**
 * Animate the next layout change (a ticked item sliding to the bottom, a row
 * opening), unless reduce motion is on.
 */
export function useLayoutMotion() {
  const reduced = useReducedMotion();
  return useCallback(() => {
    if (!reduced) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [reduced]);
}
