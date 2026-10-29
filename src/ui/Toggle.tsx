import { useId } from 'react';
import { sfx } from '../audio/sfx';

export interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange(checked: boolean): void;
}

export function Toggle({ label, description, checked, onChange }: ToggleProps) {
  const id = useId();
  return (
    <div className="toggle-row">
      <div className="toggle-text">
        <label htmlFor={id} className="toggle-label">
          {label}
        </label>
        {description && <p className="toggle-desc">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        className={`switch${checked ? ' is-on' : ''}`}
        onClick={() => {
          sfx.play('click');
          onChange(!checked);
        }}
      >
        <span className="switch-knob" aria-hidden="true" />
        <span className="switch-text">{checked ? 'ON' : 'OFF'}</span>
      </button>
    </div>
  );
}
