import { useRouter } from 'expo-router';
import { useCallback } from 'react';

/** Go to Home, Your Kitchen or Recipes from anywhere: close pushed screens first, then switch tab. */
export function useGoToTab() {
  const router = useRouter();
  return useCallback(
    (href: '/' | '/kitchen' | '/recipes') => {
      // From a pushed screen, pop back to the tabs on the right tab; from a tab, just switch.
      if (router.canDismiss()) router.dismissTo(href);
      else router.navigate(href);
    },
    [router],
  );
}
