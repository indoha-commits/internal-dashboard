import { useState, useEffect, useCallback, useRef } from 'react';

type UseApiState<T> = {
  loading: boolean;
  error: string | null;
  data: T | null;
};

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = [],
): UseApiState<T> & { refresh: () => Promise<void> } {
  const [state, setState] = useState<UseApiState<T>>({
    loading: true,
    error: null,
    data: null,
  });
  const mountedRef = useRef(true);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    mountedRef.current = true;
    fetcherRef.current = fetcher;
  });

  const execute = useCallback(async () => {
    setState({ loading: true, error: null, data: null });
    try {
      const data = await fetcherRef.current();
      if (mountedRef.current) {
        setState({ loading: false, error: null, data });
      }
    } catch (e) {
      if (mountedRef.current) {
        setState({
          loading: false,
          error: e instanceof Error ? e.message : String(e),
          data: null,
        });
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    execute();
    return () => {
      mountedRef.current = false;
    };
  }, deps);

  return { ...state, refresh: execute };
}
