/** Atlas side of the D13 embed contract. */

export type ChalkMessage =
  | { type: 'chalk:ready' }
  | { type: 'chalk:sidebar'; open: boolean }
  | { type: 'chalk:board'; id: string; name?: string };

export type AtlasMessage =
  | { type: 'chalk:set-sidebar'; open: boolean }
  | { type: 'chalk:toggle-sidebar' }
  | { type: 'chalk:open-board'; id: string };

export function originOf(url: string): string | null {
  try {
    const o = new URL(url).origin;
    return o === 'null' ? null : o;
  } catch {
    return null;
  }
}

/** Returns the message only when it comes from the expected origin and has a known, well-formed shape. */
export function parseChalkMessage(origin: string, data: unknown, expectedOrigin: string | null): ChalkMessage | null {
  if (!expectedOrigin || origin !== expectedOrigin) return null;
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Record<string, unknown>;
  if (d.source !== 'chalk') return null;
  switch (d.type) {
    case 'chalk:ready':
      return { type: 'chalk:ready' };
    case 'chalk:sidebar':
      return typeof d.open === 'boolean' ? { type: 'chalk:sidebar', open: d.open } : null;
    case 'chalk:board':
      if (typeof d.id !== 'string' || d.id === '') return null;
      return { type: 'chalk:board', id: d.id, name: typeof d.name === 'string' ? d.name : undefined };
    default:
      return null;
  }
}

export function toChalk(msg: AtlasMessage): { source: 'atlas' } & AtlasMessage {
  return { source: 'atlas', ...msg };
}
