import { useCallback, useEffect, useState } from 'react';
import { api, type Library } from './api';

export type LibraryState =
  | { status: 'loading' }
  | { status: 'ok'; data: Library }
  | { status: 'error'; message: string };

/** Chalk's library via the Atlas backend. Refreshes on window focus so new pages show up. */
export function useLibrary(): { library: LibraryState; reload: () => void } {
  const [library, setLibrary] = useState<LibraryState>({ status: 'loading' });
  const reload = useCallback(() => {
    api
      .library()
      .then((data) => setLibrary({ status: 'ok', data }))
      .catch((e: Error) => setLibrary({ status: 'error', message: e.message }));
  }, []);
  useEffect(() => {
    reload();
    window.addEventListener('focus', reload);
    return () => window.removeEventListener('focus', reload);
  }, [reload]);
  return { library, reload };
}

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
