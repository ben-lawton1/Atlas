import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const button = cva(
  'inline-flex items-center justify-center gap-2 border border-card-edge bg-card text-label font-semibold transition-colors hover:bg-hover disabled:opacity-60 disabled:cursor-default disabled:hover:bg-card',
  {
    variants: {
      size: {
        pill: 'min-h-11 px-[18px] rounded-pill text-[0.875rem]',
        icon: 'size-11 rounded-full p-0',
        sm: 'min-h-11 px-3 rounded-[14px] text-[0.8125rem]',
      },
    },
    defaultVariants: { size: 'pill' },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className, size, type = 'button', ...rest }, ref) {
  return <button ref={ref} type={type} className={cn(button({ size }), className)} {...rest} />;
});
