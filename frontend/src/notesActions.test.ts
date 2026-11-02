import { describe, expect, it, vi } from 'vitest';
import type { Library } from './api';
import { createNotesActions, type NotesApi } from './notesActions';

const lib = (...ids: string[]): Library => ({
  notebooks: [{ name: 'N', sections: [{ name: 'S', pages: ids.map((id) => ({ id, name: id, updatedAt: '', notebook: 'N', section: 'S' })) }] }],
});

function setup(opts: { library?: Library | null; current?: string | null } = {}) {
  const calls: string[] = [];
  const api = {
    createNotebook: vi.fn(async (name: string) => ({ name: name + '!' })),
    renameNotebook: vi.fn(async (_nb: string, name: string) => ({ name: name + '-' })),
    deleteNotebook: vi.fn(async () => undefined),
    createSection: vi.fn(async (_nb: string, name: string) => ({ name })),
    renameSection: vi.fn(async (_nb: string, _s: string, name: string) => ({ name })),
    deleteSection: vi.fn(async () => undefined),
    createBoard: vi.fn(async (notebook: string, section: string) => ({ id: 'new1', name: 'Untitled', notebook, section })),
    renameBoard: vi.fn(async () => ({})),
    deleteBoard: vi.fn(async () => undefined),
  } satisfies NotesApi;
  const navigate = vi.fn((h: string) => void calls.push('nav ' + h));
  const deps = {
    api,
    refresh: vi.fn(async () => (calls.push('refresh'), opts.library === undefined ? lib('a') : opts.library)),
    announce: vi.fn(() => void calls.push('announce')),
    navigate,
    currentBoardId: () => opts.current ?? null,
  };
  return { actions: createNotesActions(deps), api, navigate, calls };
}

describe('notes actions', () => {
  it('addPage creates, refetches, announces, then opens the new page', async () => {
    const { actions, api, calls } = setup();
    const place = await actions.addPage('N', 'S');
    expect(api.createBoard).toHaveBeenCalledWith('N', 'S');
    expect(calls).toEqual(['refresh', 'announce', 'nav /notes/new1']);
    expect(place).toEqual({ notebook: 'N', section: 'S', id: 'new1' });
  });

  it('addNotebook makes the notebook, a first section and a page in the names Chalk returned', async () => {
    const { actions, api } = setup();
    const place = await actions.addNotebook();
    expect(api.createNotebook).toHaveBeenCalledWith('New Notebook');
    expect(api.createSection).toHaveBeenCalledWith('New Notebook!', 'Quick Notes');
    expect(api.createBoard).toHaveBeenCalledWith('New Notebook!', 'Quick Notes');
    expect(place.notebook).toBe('New Notebook!');
  });

  it('addSection creates the section and a page in it', async () => {
    const { actions, api } = setup();
    await actions.addSection('N');
    expect(api.createSection).toHaveBeenCalledWith('N', 'New Section');
    expect(api.createBoard).toHaveBeenCalledWith('N', 'New Section');
  });

  it('renames resolve to the final name and sync without navigating', async () => {
    const { actions, navigate, calls } = setup();
    expect(await actions.renameNotebook('N', 'X')).toBe('X-');
    expect(await actions.renameSection('N', 'S', 'Y')).toBe('Y');
    await actions.renamePage('a', 'Z');
    expect(navigate).not.toHaveBeenCalled();
    expect(calls.filter((c) => c === 'announce')).toHaveLength(3);
  });

  it('deleting the open page goes Home', async () => {
    const { actions, navigate } = setup({ library: lib('other'), current: 'a' });
    await actions.deletePage('a');
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('deleting the section or notebook that holds the open page goes Home', async () => {
    const s = setup({ library: lib(), current: 'a' });
    await s.actions.deleteSection('N', 'S');
    expect(s.navigate).toHaveBeenCalledWith('/');
    const n = setup({ library: { notebooks: [] }, current: 'a' });
    await n.actions.deleteNotebook('N');
    expect(n.navigate).toHaveBeenCalledWith('/');
  });

  it('deleting something else stays put', async () => {
    const { actions, navigate } = setup({ library: lib('a', 'b'), current: 'a' });
    await actions.deletePage('b');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not navigate when the library could not be refetched', async () => {
    const { actions, navigate } = setup({ library: null, current: 'a' });
    await actions.deletePage('a');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('a failing call rejects and announces nothing', async () => {
    const { actions, api, calls } = setup();
    api.createBoard.mockRejectedValueOnce(new Error('boom'));
    await expect(actions.addPage('N', 'S')).rejects.toThrow('boom');
    expect(calls).toEqual([]);
  });
});
