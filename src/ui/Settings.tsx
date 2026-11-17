import { useState } from 'react';
import { sfx } from '../audio/sfx';
import { communityEnabled, forgetDevice } from '../net/community';
import { useSave } from '../state/SaveContext';
import { setCrowdSharing, useCrowdSharing } from '../state/privacy';
import { Button, LinkButton } from './Button';
import { Toggle } from './Toggle';
import { useToast } from './Toast';

export function Settings() {
  const { save, update, reset } = useSave();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [forgetting, setForgetting] = useState(false);
  const s = save.settings;
  const sharing = useCrowdSharing();

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
        <Toggle
          label="Share my picks anonymously"
          description="Adds your picks to the crowd stats with a random ID for this device. No names or accounts."
          checked={sharing.on}
          onChange={(v) => setCrowdSharing(v)}
        />
        {communityEnabled() && (
          <Button
            variant="ghost"
            disabled={forgetting}
            onClick={async () => {
              setForgetting(true);
              const ok = await forgetDevice();
              setForgetting(false);
              toast(ok ? 'Your crowd data is deleted' : 'Couldn’t reach the server. Try again later.');
            }}
          >
            {forgetting ? 'Deleting…' : 'Delete my crowd data'}
          </Button>
        )}
        <p className="small settings-privacy">
          <a href="#/privacy">Privacy &amp; terms</a>
        </p>
      </section>

      <section className="card">
        <h2 className="h3">Progress</h2>
        <p className="muted small">Deletes your dailies, streaks and Endless stats on this device. Settings stay.</p>
        {confirming ? (
          <div className="row">
            <Button
              variant="danger"
              sound={false}
              onClick={() => {
                reset();
                sfx.play('dryer');
                setConfirming(false);
                toast('Progress reset');
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
        <LinkButton href="#/privacy">Privacy</LinkButton>
        <LinkButton href="#/">Menu</LinkButton>
      </div>
    </div>
  );
}
