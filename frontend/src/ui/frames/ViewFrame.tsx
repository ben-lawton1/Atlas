import type { ReactNode } from 'react';
import { Card } from '@/components/ui/glass';

/** Shared frame for every tab (D44): the view's h1, a one-line description, then a grid of sections. */
export function ViewFrame({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[22px]" data-testid={`${id}-view`}>
      <header className="flex flex-col gap-1.5">
        <h1 className="view-h1" data-testid="view-title">{title}</h1>
        <p className="m-0 text-[0.875rem] text-label-secondary">{description}</p>
      </header>
      {children}
    </div>
  );
}

export function SectionGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] items-stretch gap-4">{children}</div>;
}

/** A card with a title, what will go here, and a sentence naming the missing source. No controls. */
export function FrameSection({ title, what, empty }: { title: string; what: string; empty: string }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="m-0 text-base font-bold text-label-strong">{title}</h2>
        <span className="text-[0.8125rem] text-label-secondary">{what}</span>
      </div>
      <p className="m-0 rounded-row bg-row px-3 py-2.5 text-[0.8125rem] text-label-secondary" data-testid="frame-empty">{empty}</p>
    </Card>
  );
}
