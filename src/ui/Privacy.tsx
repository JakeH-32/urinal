// Privacy policy + terms (#/privacy, alias #/terms). Plain language on purpose: no jokes here.
// Keep it in step with what the code actually does: src/state/storage.ts, src/state/privacy.ts,
// src/net/community.ts, supabase/schema.sql and index.html (third-party requests).
import { useMemo } from 'react';
import { communityEnabled } from '../net/community';
import { readCrowdDeviceId, useCrowdSharing } from '../state/privacy';
import { LinkButton } from './Button';

const UPDATED = 'November 16, 2026';

function DeviceId() {
  const { on } = useCrowdSharing();
  // Re-read when the choice changes (turning it off deletes the id).
  const id = useMemo(() => readCrowdDeviceId(), [on]);
  return id ? (
    <p className="small">
      This device’s crowd ID: <code className="code privacy-id">{id}</code>
    </p>
  ) : (
    <p className="small muted">This device has no crowd ID right now.</p>
  );
}

export function Privacy() {
  const live = communityEnabled();

  return (
    <article className="legal">
      <h1 className="page-title">Privacy &amp; terms</h1>
      <p className="muted small">Last updated {UPDATED}</p>

      <section className="legal-section card">
        <h2 className="h3">The short version</h2>
        <ul>
          <li>No accounts, no names, no email, no location, no ads, no tracking cookies.</li>
          <li>Your progress stays on your device.</li>
          <li>
            If crowd stats are on, each pick is sent with a random ID for your device, so we can show how everyone else
            played. You can turn this off in <a href="#/settings">Settings</a>.
          </li>
        </ul>
      </section>

      <section className="legal-section">
        <h2 className="h3">Stored on your device</h2>
        <p>Urinal uses your browser’s local storage, not cookies. It holds:</p>
        <ul>
          <li>
            <strong>Your progress</strong>: daily results, streaks, Endless stats and settings.
          </li>
          <li>
            <strong>A crowd ID</strong>: a random code made up by your browser, plus a list of which recent picks were
            already sent. It exists only while crowd sharing is on.
          </li>
          <li>
            <strong>Your sharing choice</strong>, so we don’t ask again.
          </li>
        </ul>
        <p>None of this leaves your device unless described below.</p>
      </section>

      <section className="legal-section">
        <h2 className="h3">What’s sent, and when</h2>
        <p>
          <strong>Crowd stats</strong> (only while sharing is on). For each daily round you play: the puzzle number,
          the round, the spot you picked and its grade. When you finish a day: your score, number of Clears, and
          whether this is your first day, you also played yesterday, or you’re back after a break (worked out on your
          device from your own progress). Each
          row carries your crowd ID and the time it arrived. That lets us count each device once and show results like
          “Most went with #7”.
        </p>
        <p>
          <strong>Reading the stats</strong> sends only the puzzle number and gets back totals. The database gives
          out totals only, never one player’s picks.
        </p>
        <p>
          <strong>Sharing a result</strong> uses your phone’s share sheet or clipboard, only when you tap Share. Where
          it goes is up to you.
        </p>
        <p>
          Like any website, the services below see your IP address and browser type when your browser connects to
          them. We don’t combine that with your crowd ID.
        </p>
        {!live && <p className="muted small">Crowd stats aren’t switched on in this version of the game, so nothing is sent.</p>}
      </section>

      <section className="legal-section">
        <h2 className="h3">Who handles it</h2>
        <ul>
          <li>
            <strong>GitHub Pages</strong> hosts the site and keeps standard server logs.
          </li>
          <li>
            <strong>Cloudflare</strong> provides DNS for urinal.app.
          </li>
          <li>
            <strong>Supabase</strong> stores the crowd stats.
          </li>
          <li>
            <strong>Google Fonts</strong> serves the site’s fonts, so Google sees your IP address when the page loads.
          </li>
        </ul>
        <p>These providers may process data in the United States and elsewhere. We don’t sell or share data with anyone else.</p>
      </section>

      <section className="legal-section">
        <h2 className="h3">How long it’s kept</h2>
        <p>
          Data on your device stays until you reset it or clear your browser’s site data. Crowd stats rows have no
          names or contact details attached and are currently kept with no set end date, so past days’ stats keep
          working. Provider logs are kept under each provider’s own policy.
        </p>
      </section>

      <section className="legal-section">
        <h2 className="h3">Your choices</h2>
        <ul>
          <li>
            <strong>Stop sharing:</strong> turn off “Share my picks anonymously” in <a href="#/settings">Settings</a>.
            That also deletes the crowd ID from this device. In the EU, UK and Switzerland, sharing starts off until
            you turn it on.
          </li>
          <li>
            <strong>Delete your progress:</strong> Settings → Reset progress, or clear this site’s data in your browser.
          </li>
          <li>
            <strong>Delete what was sent:</strong> tap “Delete my crowd data” in <a href="#/settings">Settings</a>.
            That removes every row sent with this device’s crowd ID, then deletes the ID from this device.
          </li>
        </ul>
        <DeviceId />
      </section>

      <section className="legal-section">
        <h2 className="h3">Children</h2>
        <p>
          Urinal isn’t directed at children under 13, and we don’t knowingly collect data from them.
        </p>
      </section>

      <section className="legal-section">
        <h2 className="h3">Ads and cookies</h2>
        <p>
          Urinal shows no ads and sets no cookies today. If that changes, this section will name the ad provider, list
          the cookies it uses, and explain how to opt out, and visitors in the EEA, UK and Switzerland will be asked
          before any ad cookies are set.
        </p>
      </section>

      <section className="legal-section">
        <h2 className="h3">Changes</h2>
        <p>If this policy changes, the date at the top changes too.</p>
      </section>

      <h2 className="page-title legal-terms" id="terms">
        Terms
      </h2>

      <section className="legal-section">
        <ul>
          <li>Urinal is a free game, for entertainment only. The “urinal code” is a joke, not advice.</li>
          <li>
            It’s provided as is, with no warranty of any kind. It may change, break or go away. To the extent the law
            allows, we aren’t liable for any loss from using it.
          </li>
          <li>Please don’t flood or tamper with the crowd stats. We may remove data that looks automated.</li>
          <li>You’re welcome to share your results and screenshots.</li>
          <li>
            Characters, places and situations are fictional. Product and company names belong to their owners, and
            Urinal isn’t affiliated with or endorsed by any of them.
          </li>
          <li>The game’s code, art and writing are original, all rights reserved. Fonts: Archivo Black and Inter, under the SIL Open Font License.</li>
          <li>These terms are governed by the laws of Colorado, USA.</li>
        </ul>
      </section>

      <div className="row row--center">
        <LinkButton href="#/settings">Settings</LinkButton>
        <LinkButton href="#/">Menu</LinkButton>
      </div>
    </article>
  );
}
