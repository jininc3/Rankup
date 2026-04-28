import { useRouter as useExpoRouter } from 'expo-router';
import { useRef, useMemo } from 'react';

const DEBOUNCE_MS = 300;

/**
 * Drop-in replacement for expo-router's useRouter that prevents
 * double-navigation when a button is tapped twice quickly.
 */
export function useRouter() {
  const router = useExpoRouter();
  const lastNavRef = useRef(0);

  return useMemo(() => {
    const guard = <T extends (...args: any[]) => any>(fn: T): T => {
      return ((...args: any[]) => {
        const now = Date.now();
        if (now - lastNavRef.current < DEBOUNCE_MS) return;
        lastNavRef.current = now;
        return fn(...args);
      }) as unknown as T;
    };

    return {
      ...router,
      push: guard(router.push),
      replace: guard(router.replace),
      navigate: guard(router.navigate),
    };
  }, [router]);
}
