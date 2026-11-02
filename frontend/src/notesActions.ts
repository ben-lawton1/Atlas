/** Notes management from Atlas (D21, D24): each action calls the Atlas backend, refetches the library, tells an embedded Chalk, and moves the route when needed. */
import { notesHref } from './router';
import { pageExists } from './tree';
import type { Library, NewBoard } from './api';

export const NEW_NOTEBOOK_NAME = 'New Notebook';
export const NEW_SECTION_NAME = 'New Section';
export const FIRST_SECTION_NAME = 'Quick Notes';

export interface NotesApi {
  createNotebook(name: string): Promise<{ name: string }>;
  renameNotebook(nb: string, name: string): Promise<{ name: string }>;
  deleteNotebook(nb: string): Promise<void>;
  createSection(nb: string, name: string): Promise<{ name: string }>;
  renameSection(nb: string, sec: string, name: string): Promise<{ name: string }>;
  deleteSection(nb: string, sec: string): Promise<void>;
  createBoard(notebook: string, section: string): Promise<NewBoard>;
  renameBoard(id: string, name: string): Promise<unknown>;
  deleteBoard(id: string): Promise<void>;
}

export interface NotesDeps {
  api: NotesApi;
  /** Refetches the library; resolves to it, or null when Chalk can't be reached. */
  refresh(): Promise<Library | null>;
  /** Tells an embedded Chalk to reload its tree. */
  announce(): void;
  navigate(href: string): void;
  /** The page open in the notes view right now, if any. */
  currentBoardId(): string | null;
}

export interface NewPlace {
  notebook: string;
  section: string;
  id: string;
}

export function createNotesActions(d: NotesDeps) {
  async function changed(): Promise<Library | null> {
    const lib = await d.refresh();
    d.announce();
    return lib;
  }

  async function open(board: NewBoard): Promise<NewPlace> {
    await changed();
    d.navigate(notesHref(board.id));
    return { notebook: board.notebook, section: board.section, id: board.id };
  }

  /** After a delete: leave the notes view if the open page is gone. */
  async function afterDelete(): Promise<void> {
    const open = d.currentBoardId();
    const lib = await changed();
    if (open && lib && !pageExists(lib, open)) d.navigate('/');
  }

  return {
    addPage: async (notebook: string, section: string): Promise<NewPlace> => open(await d.api.createBoard(notebook, section)),
    addSection: async (notebook: string): Promise<NewPlace> => {
      const sec = await d.api.createSection(notebook, NEW_SECTION_NAME);
      return open(await d.api.createBoard(notebook, sec.name));
    },
    addNotebook: async (): Promise<NewPlace> => {
      const nb = await d.api.createNotebook(NEW_NOTEBOOK_NAME);
      const sec = await d.api.createSection(nb.name, FIRST_SECTION_NAME);
      return open(await d.api.createBoard(nb.name, sec.name));
    },
    /** Resolves to the final name; Chalk may adjust it (suffix, "-"). */
    renameNotebook: async (nb: string, name: string): Promise<string> => {
      const r = await d.api.renameNotebook(nb, name);
      await changed();
      return r.name;
    },
    renameSection: async (nb: string, sec: string, name: string): Promise<string> => {
      const r = await d.api.renameSection(nb, sec, name);
      await changed();
      return r.name;
    },
    renamePage: async (id: string, name: string): Promise<void> => {
      await d.api.renameBoard(id, name);
      await changed();
    },
    deletePage: async (id: string): Promise<void> => {
      await d.api.deleteBoard(id);
      await afterDelete();
    },
    deleteSection: async (nb: string, sec: string): Promise<void> => {
      await d.api.deleteSection(nb, sec);
      await afterDelete();
    },
    deleteNotebook: async (nb: string): Promise<void> => {
      await d.api.deleteNotebook(nb);
      await afterDelete();
    },
  };
}

export type NotesActions = ReturnType<typeof createNotesActions>;
