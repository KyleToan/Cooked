import { useRouter } from 'expo-router';
import { useCallback } from 'react';

/** Go to Home or Recipes from anywhere: close pushed screens first, then switch tab. */
export function useGoToTab() {
  const router = useRouter();
  return useCallback(
    (href: '/' | '/recipes') => {
      if (router.canDismiss()) router.dismissAll();
      router.navigate(href);
    },
    [router],
  );
}
