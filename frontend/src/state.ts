import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type Library } from './api';

export type LibraryState =
  | { status: 'loading' }
  | { status: 'ok'; data: Library }
  | { status: 'error'; message: string };

/** Chalk's library via the Atlas backend. Refreshes on window focus so new pages show up. */
export function useLibrary(): { library: LibraryState; reload: () => Promise<Library | null> } {
  const [library, setLibrary] = useState<LibraryState>({ status: 'loading' });
  const seq = useRef(0);
  /** Refetches; resolves to the library, or null if Chalk can't be reached. Only the newest request updates the state. */
  const reload = useCallback((): Promise<Library | null> => {
    const mine = ++seq.current;
    return api.library().then(
      (data) => {
        if (mine === seq.current) setLibrary({ status: 'ok', data });
        return data;
      },
      (e: Error) => {
        if (mine === seq.current) setLibrary({ status: 'error', message: e.message });
        return null;
      },
    );
  }, []);
  useEffect(() => {
    void reload();
    const onFocus = () => void reload();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
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
