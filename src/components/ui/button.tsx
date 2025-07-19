/**
 * shadcn‑style `<Button>` re‑implementation con varianti e size.
 *
 * Variants  : default | outline | ghost | destructive | secondary
 * Sizes     : default | icon
 */

'use client';
import React from 'react';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary';
  size?: 'default' | 'icon';
}

const baseCls =
  'inline-flex items-center justify-center font-medium transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:pointer-events-none';

const variantCls: Record<string, string> = {
  default:
    'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary',
  outline:
    'border border-input bg-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-accent',
  ghost:
    'hover:bg-accent hover:text-accent-foreground focus-visible:ring-accent',
  destructive:
    'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive',
  secondary:
    'bg-muted text-foreground hover:bg-muted/80 focus-visible:ring-muted-foreground',
};

const sizeCls: Record<string, string> = {
  default: 'px-3 py-1.5 text-sm',
  icon: 'p-2 h-9 w-9',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'default', size = 'default', className = '', ...props },
    ref,
  ) => (
    <button
      ref={ref}
      className={`${baseCls} ${variantCls[variant]} ${sizeCls[size]} ${className}`.trim()}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

export default Button;
