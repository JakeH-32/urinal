import { useState } from 'react';
import { sfx } from '../audio/sfx';
import { useSave } from '../state/SaveContext';
import { Button, LinkButton } from './Button';
import { Toggle } from './Toggle';
import { useToast } from './Toast';

export function Settings() {
  const { save, update, reset } = useSave();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const s = save.settings;

  const setSetting = (patch: Partial<typeof s>) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));

  return (
    <div className="settings">
      <h1 className="page-title">Settings</h1>

      <section className="card">
        <Toggle
          label="Sound"
          description="Footsteps, chimes and the flush."
          checked={s.sound}
          onChange={(v) => {
            sfx.setMuted(!v);
            setSetting({ sound: v });
          }}
        />
        <Toggle
          label="Reduced motion"
          description="Skip the walk-in and tile flips. Your system setting also counts."
          checked={s.reducedMotion}
          onChange={(v) => setSetting({ reducedMotion: v })}
        />
      </section>

      <section className="card">
        <h2 className="h3">Progress</h2>
        <p className="muted small">Deletes your dailies, streaks and practice stats on this device. Settings stay.</p>
        {confirming ? (
          <div className="row">
            <Button
              variant="danger"
              sound={false}
              onClick={() => {
                reset();
                sfx.play('dryer');
                setConfirming(false);
                toast('Progress reset.');
              }}
            >
              Yes, reset everything
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="danger" onClick={() => setConfirming(true)}>
            Reset progress
          </Button>
        )}
      </section>

      <div className="row row--center">
        <LinkButton href="#/how">How to play</LinkButton>
        <LinkButton href="#/">Menu</LinkButton>
      </div>
    </div>
  );
}
