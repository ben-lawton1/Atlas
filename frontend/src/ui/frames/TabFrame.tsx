import type { Route } from '../../router';
import { FrameSection, SectionGrid, ViewFrame } from './ViewFrame';

type FrameDef = { id: string; title: string; description: string; sections: { title: string; what: string }[]; empty: string };

const FRAMES: Partial<Record<Route['name'], FrameDef>> = {
  tasks: {
    id: 'tasks', title: 'Tasks', description: 'What is due, what is coming and what is done.',
    sections: [{ title: 'Today', what: 'Due today' }, { title: 'Upcoming', what: 'Due in the next days' }, { title: 'Done', what: 'Finished recently' }],
    empty: "Tasks aren't connected yet. Where they live is still being decided.",
  },
  notes: {
    id: 'notes', title: 'Notes', description: 'Your notes, pinned and recent.',
    sections: [{ title: 'Pinned', what: 'Notes you keep close' }, { title: 'Recent', what: 'Latest edits' }, { title: 'Notebooks', what: 'Notes by notebook' }],
    empty: "Notes are being redesigned. They'll show up here.",
  },
  projects: {
    id: 'projects', title: 'Projects', description: 'What you are building and where each project stands.',
    sections: [{ title: 'Active', what: 'Projects in progress' }, { title: 'Recently updated', what: 'Latest activity' }],
    empty: 'Projects from your brain will appear here.',
  },
  messages: {
    id: 'messages', title: 'Messages', description: 'Mail and chat in one place.',
    sections: [{ title: 'Inbox', what: 'Email that needs you' }, { title: 'Slack', what: 'Mentions and direct messages' }],
    empty: 'Connect Gmail and Slack to see messages here.',
  },
  people: {
    id: 'people', title: 'People', description: 'Who you talk to and who you owe a reply.',
    sections: [{ title: 'Recent contacts', what: 'People you were in touch with' }, { title: 'Follow-ups', what: 'Who is waiting on you' }],
    empty: 'People from your brain and contacts will appear here.',
  },
};

export function hasFrame(name: Route['name']): boolean {
  return name in FRAMES;
}

export function TabFrame({ name }: { name: Route['name'] }) {
  const f = FRAMES[name];
  if (!f) return null;
  return (
    <ViewFrame id={f.id} title={f.title} description={f.description}>
      <SectionGrid>
        {f.sections.map((s) => <FrameSection key={s.title} title={s.title} what={s.what} empty={f.empty} />)}
      </SectionGrid>
    </ViewFrame>
  );
}
