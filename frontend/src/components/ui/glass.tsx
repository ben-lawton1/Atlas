// The only place backdrop-filter is applied (D43). Glass = functional layer (nav, bar, overlays); main = standard material; Card = plain translucent, no blur.
import { forwardRef, type ComponentProps, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

const BLUR = '[backdrop-filter:blur(28px)_saturate(160%)] [-webkit-backdrop-filter:blur(28px)_saturate(160%)]';

const VARIANTS = {
  nav: `bg-glass border border-glass-edge shadow-glass rounded-nav ${BLUR}`,
  bar: `bg-glass border border-glass-edge shadow-glass rounded-bar ${BLUR}`,
  overlay: `bg-glass border border-glass-edge shadow-glass rounded-nav ${BLUR}`,
  main: `bg-main border border-main-edge shadow-main rounded-main ${BLUR}`,
} as const;

export type GlassVariant = keyof typeof VARIANTS;

type GlassProps = Omit<ComponentProps<'div'>, 'ref'> & { variant: GlassVariant; as?: 'div' | 'nav' | 'header' | 'main' | 'aside' };

export const GlassPanel = forwardRef<HTMLElement, GlassProps>(function GlassPanel({ variant, as = 'div', className, children, ...rest }, ref) {
  const Tag = as as 'div';
  return (
    <Tag ref={ref as never} data-glass={variant} className={cn(VARIANTS[variant], className)} {...rest}>
      {children}
    </Tag>
  );
});

type CardProps = {
  as?: 'section' | 'div' | 'article';
  radius?: 'card' | 'tile';
  className?: string;
  children?: ReactNode;
} & Omit<ComponentProps<'section'>, 'ref' | 'className' | 'children' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'>;

const MOTION = { section: motion.section, div: motion.div, article: motion.article } as const;

/** Plain translucent card with a 150ms hover lift (MotionConfig makes it still under reduced motion). */
export function Card({ as = 'section', radius = 'card', className, children, ...rest }: CardProps) {
  const M = MOTION[as] as typeof motion.section;
  return (
    <M
      data-card=""
      whileHover={{ y: -2, boxShadow: 'var(--card-shadow-hover)' }}
      transition={{ duration: 0.15 }}
      className={cn('bg-card border border-card-edge shadow-card text-label', radius === 'card' ? 'rounded-card p-[22px]' : 'rounded-tile p-[18px]', className)}
      {...rest}
    >
      {children}
    </M>
  );
}
