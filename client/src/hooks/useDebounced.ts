import { useEffect, useState } from 'react';

/**
 * Delay a fast-changing value so a search box does not fire a query per
 * keystroke — the free-tier instance has 0.5 vCPU and does not need the traffic.
 */
export function useDebounced<T>(value: T, delayMs = 280): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
