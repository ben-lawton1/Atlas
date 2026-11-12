import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const RAIL_OPEN_DELAY = 90;
export const RAIL_CLOSE_DELAY = 220;

type Timers = {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (id: unknown) => void;
};

/**
 * Hover-intent state machine for the collapsed nav rail (D45). Pure (timers injectable) so it is unit-testable
 * without a DOM. Open after 90ms of hover, close 220ms after the pointer leaves; focus (keyboard) opens at once and
 * keeps it open; a touch "pin" keeps it open until closed.
 */
export function createRailController(onChange: (open: boolean) => void, opts: { openDelay?: number; closeDelay?: number; timers?: Timers } = {}) {
  const openDelay = opts.openDelay ?? RAIL_OPEN_DELAY;
  const closeDelay = opts.closeDelay ?? RAIL_CLOSE_DELAY;
  const timers: Timers = opts.timers ?? { setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms), clearTimeout: (id) => globalThis.clearTimeout(id as number) };
  let open = false;
  let hover = false;
  let focus = false;
  let pinned = false;
  let timer: unknown = null;

  const clear = () => {
    if (timer !== null) timers.clearTimeout(timer);
    timer = null;
  };
  const set = (v: boolean) => {
    if (open === v) return;
    open = v;
    onChange(v);
  };
  const wanted = () => hover || focus || pinned;
  const settle = () => {
    clear();
    if (wanted()) {
      if (!open) timer = timers.setTimeout(() => { timer = null; set(true); }, hover && !focus && !pinned ? openDelay : 0);
    } else if (open) {
      timer = timers.setTimeout(() => { timer = null; set(false); }, closeDelay);
    }
  };

  return {
    isOpen: () => open,
    pointerEnter() { hover = true; settle(); },
    pointerLeave() { hover = false; settle(); },
    focusIn() { focus = true; clear(); set(true); },
    focusOut() { focus = false; settle(); },
    /** Escape, or a tap on an item: collapse now, even if the pointer is still over the rail. */
    close() { clear(); hover = false; focus = false; pinned = false; set(false); },
    /** Touch without hover: toggle open/closed. */
    togglePinned() { clear(); pinned = !pinned; if (!pinned) { hover = false; focus = false; } set(pinned); },
    dispose() { clear(); },
  };
}

/** React binding: `expanded` plus handlers for the rail's shell element. Touch pointers are ignored (they pin instead). */
export function useRailExpand() {
  const [expanded, setExpanded] = useState(false);
  const ctl = useMemo(() => createRailController(setExpanded), []);
  const shell = useRef<HTMLDivElement | null>(null);
  useEffect(() => () => ctl.dispose(), [ctl]);

  // A tap outside a pinned/open rail closes it; Escape closes it from anywhere.
  useEffect(() => {
    if (!expanded) return;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch' && shell.current && !shell.current.contains(e.target as Node)) ctl.close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') ctl.close(); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [expanded, ctl]);

  const onPointerEnter = useCallback((e: React.PointerEvent) => { if (e.pointerType !== 'touch') ctl.pointerEnter(); }, [ctl]);
  const onPointerLeave = useCallback((e: React.PointerEvent) => { if (e.pointerType !== 'touch') ctl.pointerLeave(); }, [ctl]);
  const onFocus = useCallback((e: React.FocusEvent) => {
    // keyboard focus only: a mouse click leaves focus on the link and must not pin the rail open
    if ((e.target as HTMLElement).matches?.(':focus-visible')) ctl.focusIn();
  }, [ctl]);
  const onBlur = useCallback((e: React.FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) ctl.focusOut();
  }, [ctl]);

  return { expanded, shell, ctl, handlers: { onPointerEnter, onPointerLeave, onFocus, onBlur } };
}
