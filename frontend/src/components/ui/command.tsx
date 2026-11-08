// shadcn-shaped Command + CommandDialog on cmdk and Radix Dialog; the overlay is a glass panel.
import type { ComponentProps, ReactNode } from 'react';
import { Command as Cmdk } from 'cmdk';
import * as Dialog from '@radix-ui/react-dialog';
import { Search } from 'lucide-react';
import { GlassPanel } from './glass';
import { cn } from '@/lib/utils';

export function CommandDialog(props: { open: boolean; onOpenChange: (open: boolean) => void; title: string; children: ReactNode }) {
  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="cmd-overlay fixed inset-0 z-40 bg-[rgba(8,10,20,0.45)]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="cmd-content fixed left-1/2 top-[14vh] z-50 w-[min(640px,calc(100vw-24px))] -translate-x-1/2 outline-none"
        >
          <Dialog.Title className="absolute size-px overflow-hidden [clip:rect(0_0_0_0)]">{props.title}</Dialog.Title>
          <GlassPanel variant="overlay" className="overflow-hidden">
            {props.children}
          </GlassPanel>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Command({ className, ...rest }: ComponentProps<typeof Cmdk>) {
  return <Cmdk className={cn('flex flex-col text-label', className)} {...rest} />;
}

export function CommandInput({ className, ...rest }: ComponentProps<typeof Cmdk.Input>) {
  return (
    <div className="flex min-h-14 items-center gap-3 border-b border-line px-4">
      <Search aria-hidden="true" size={18} strokeWidth={1.8} className="text-label-tertiary" />
      <Cmdk.Input
        className={cn('min-h-11 flex-1 bg-transparent text-[0.9375rem] text-label outline-none placeholder:text-label-tertiary', className)}
        {...rest}
      />
    </div>
  );
}

export function CommandList({ className, ...rest }: ComponentProps<typeof Cmdk.List>) {
  return <Cmdk.List className={cn('max-h-[min(420px,60vh)] overflow-y-auto p-2', className)} {...rest} />;
}

export function CommandEmpty(props: ComponentProps<typeof Cmdk.Empty>) {
  return <Cmdk.Empty className="px-3 py-6 text-center text-[0.8125rem] text-label-secondary" {...props} />;
}

export function CommandItem({ className, ...rest }: ComponentProps<typeof Cmdk.Item>) {
  return (
    <Cmdk.Item
      className={cn(
        'flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-row px-3 text-[0.875rem] data-[selected=true]:bg-selected data-[selected=true]:text-label-strong',
        className,
      )}
      {...rest}
    />
  );
}
