import type { HTMLAttributes } from 'react';

export type CardTone = 'plain' | 'muted' | 'danger';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  tone?: CardTone;
  as?: 'div' | 'section' | 'article' | 'aside';
}

/** White card with an ink border and a chunky offset shadow. */
export function Card({ tone = 'plain', as: Tag = 'section', className, ...rest }: CardProps) {
  return <Tag className={['card', `card--${tone}`, className ?? ''].filter(Boolean).join(' ')} {...rest} />;
}
