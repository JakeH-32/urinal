// How to play: the premise, how to read a room, and the grades. No placement rules on purpose:
// players learn the urinal code by playing (see HOW_TO_PLAY in src/content).
import { useEffect } from 'react';
import { HOW_TO_PLAY, WHOS_WHO } from '../content';
import { QUIRK_STYLE } from '../scene/looks';
import { useSave } from '../state/SaveContext';
import { LinkButton } from './Button';
import { HydrationChart } from './HydrationChart';

function WhosWho() {
  return (
    <ul className="whos-who">
      {WHOS_WHO.map(({ quirk, line }) => {
        const st = QUIRK_STYLE[quirk];
        return (
          <li key={quirk}>
            <span className="whos-who-tag" style={{ background: st.color, color: st.ink }}>
              {st.emoji} {st.tag}
            </span>
            <span className="whos-who-line">{line}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function HowToPlay() {
  const { save, update } = useSave();

  useEffect(() => {
    if (!save.seenTutorial) update((s) => (s.seenTutorial ? s : { ...s, seenTutorial: true }));
  }, [save.seenTutorial, update]);

  return (
    <article className="how">
      <h1 className="page-title">How to play</h1>

      {HOW_TO_PLAY.map((sec) => (
        <section key={sec.heading} className="how-section">
          <h2 className="h3">{sec.heading}</h2>
          <p>{sec.body}</p>
          {sec.heading === 'Read the room' && <WhosWho />}
          {sec.heading === 'Grades' && <HydrationChart />}
        </section>
      ))}

      <div className="row row--center">
        <LinkButton href="#/daily" variant="primary" size="lg">
          Play today’s Urinal
        </LinkButton>
        <LinkButton href="#/endless">Endless</LinkButton>
      </div>
    </article>
  );
}
