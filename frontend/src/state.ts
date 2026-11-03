import { useEffect, useState } from 'react';

export type Async<T> = { status: 'loading' } | { status: 'ok'; data: T } | { status: 'error'; message: string; code: number };

export function useAsync<T>(load: () => Promise<T>, key: string): Async<T> {
  const [state, setState] = useState<Async<T>>({ status: 'loading' });
  useEffect(() => {
    let live = true;
    setState({ status: 'loading' });
    load().then(
      (data) => live && setState({ status: 'ok', data }),
      (e: Error & { status?: number }) => live && setState({ status: 'error', message: e.message, code: e.status ?? 0 }),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}
