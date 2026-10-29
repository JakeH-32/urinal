import type { AnchorHTMLAttributes, ComponentPropsWithRef, MouseEvent } from 'react';
import { sfx, type SfxName } from '../audio/sfx';

export type ButtonVariant = 'default' | 'primary' | 'danger' | 'go' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  /** Sound on click; false for silence. Default 'click'. */
  sound?: SfxName | false;
}

function classes(variant: ButtonVariant, size: ButtonSize, block: boolean | undefined, extra?: string): string {
  return ['btn', `btn--${variant}`, `btn--${size}`, block ? 'btn--block' : '', extra ?? ''].filter(Boolean).join(' ');
}

export type ButtonProps = CommonProps & ComponentPropsWithRef<'button'>;

/** Chunky rounded button: ink border, offset shadow, squishes when pressed. */
export function Button({ variant = 'default', size = 'md', block, sound = 'click', className, onClick, type, ...rest }: ButtonProps) {
  const handle = (e: MouseEvent<HTMLButtonElement>) => {
    if (sound) sfx.play(sound);
    onClick?.(e);
  };
  return <button type={type ?? 'button'} className={classes(variant, size, block, className)} onClick={handle} {...rest} />;
}

export type LinkButtonProps = CommonProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

/** Same look, but a real link (hash routes keep back/forward working). */
export function LinkButton({ variant = 'default', size = 'md', block, sound = 'click', className, onClick, ...rest }: LinkButtonProps) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    if (sound) sfx.play(sound);
    onClick?.(e);
  };
  return <a className={classes(variant, size, block, className)} onClick={handle} {...rest} />;
}
