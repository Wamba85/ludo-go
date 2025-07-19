/**
 * Minimal shadcn‑style `<Switch>` re‑implementation con API
 * `checked` / `onCheckedChange`.
 */

'use client';
import React from 'react';

export interface SwitchProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'checked' | 'onChange'
  > {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ checked, onCheckedChange, className = '', ...props }, ref) => (
    <label className={`inline-flex items-center cursor-pointer ${className}`}>
      <input
        ref={ref}
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        {...props}
      />
      <span
        className="w-11 h-6 relative rounded-full transition-colors bg-gray-200 peer-focus:ring-2
                   peer-focus:ring-primary/60 peer-checked:bg-primary"
      >
        <span
          className="absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full transition-transform
                       peer-checked:translate-x-5"
        />
      </span>
    </label>
  ),
);
Switch.displayName = 'Switch';

export default Switch;
