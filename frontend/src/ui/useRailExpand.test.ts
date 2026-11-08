import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRailController } from './useRailExpand';

describe('rail hover intent', () => {
  let changes: boolean[];
  let rail: ReturnType<typeof createRailController>;
  beforeEach(() => {
    vi.useFakeTimers();
    changes = [];
    rail = createRailController((o) => changes.push(o));
  });
  afterEach(() => { rail.dispose(); vi.useRealTimers(); });

  it('opens after 90ms of hover, not before', () => {
    rail.pointerEnter();
    vi.advanceTimersByTime(89);
    expect(rail.isOpen()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(rail.isOpen()).toBe(true);
    expect(changes).toEqual([true]);
  });

  it('a graze shorter than 90ms never opens it', () => {
    rail.pointerEnter();
    vi.advanceTimersByTime(60);
    rail.pointerLeave();
    vi.advanceTimersByTime(500);
    expect(changes).toEqual([]);
  });

  it('closes 220ms after the pointer leaves', () => {
    rail.pointerEnter();
    vi.advanceTimersByTime(90);
    rail.pointerLeave();
    vi.advanceTimersByTime(219);
    expect(rail.isOpen()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(rail.isOpen()).toBe(false);
  });

  it('re-entering cancels the pending close', () => {
    rail.pointerEnter();
    vi.advanceTimersByTime(90);
    rail.pointerLeave();
    vi.advanceTimersByTime(150);
    rail.pointerEnter();
    vi.advanceTimersByTime(1000);
    expect(rail.isOpen()).toBe(true);
    expect(changes).toEqual([true]);
  });

  it('Escape (close) collapses at once', () => {
    rail.pointerEnter();
    vi.advanceTimersByTime(90);
    rail.close();
    expect(rail.isOpen()).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(changes).toEqual([true, false]);
  });

  it('focus opens immediately and keeps it open after the pointer leaves', () => {
    rail.focusIn();
    expect(rail.isOpen()).toBe(true);
    rail.pointerEnter();
    rail.pointerLeave();
    vi.advanceTimersByTime(1000);
    expect(rail.isOpen()).toBe(true);
    rail.focusOut();
    vi.advanceTimersByTime(220);
    expect(rail.isOpen()).toBe(false);
  });

  it('touch pin toggles open and closed', () => {
    rail.togglePinned();
    expect(rail.isOpen()).toBe(true);
    rail.pointerLeave();
    vi.advanceTimersByTime(1000);
    expect(rail.isOpen()).toBe(true);
    rail.togglePinned();
    expect(rail.isOpen()).toBe(false);
  });
});
