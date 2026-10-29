import { useEffect, useMemo } from 'react';
import type { Evaluation } from '../types';
import { HOW_TO_PLAY } from '../content';
import { evaluate } from '../engine/code';
import { BathroomScene } from '../scene';
import { useSave } from '../state/SaveContext';
import { LinkButton } from './Button';
import { Tile } from './Tiles';
import { HydrationChart } from './HydrationChart';
import { EXAMPLE_ROOMS, placeExamples, type ExampleRoom } from './exampleRooms';
import { useReducedMotion } from './hooks';

function Example({ ex }: { ex: ExampleRoom }) {
  const reducedMotion = useReducedMotion();
  const evaluation = useMemo<Evaluation | undefined>(() => {
    try {
      return evaluate(ex.bathroom);
    } catch {
      return undefined;
    }
  }, [ex]);
  return (
    <figure className="example">
      <div className="scene-frame scene-frame--small">
        <BathroomScene bathroom={ex.bathroom} disabled picked={ex.pick} evaluation={evaluation} reducedMotion={reducedMotion} maxScale={0.72} />
      </div>
      <figcaption className="example-caption">
        <Tile grade="clear" size="sm" /> {ex.caption}
      </figcaption>
    </figure>
  );
}

export function HowToPlay() {
  const { save, update } = useSave();
  const { bySection, leftover } = useMemo(() => placeExamples(HOW_TO_PLAY, EXAMPLE_ROOMS), []);

  useEffect(() => {
    if (!save.seenTutorial) update((s) => (s.seenTutorial ? s : { ...s, seenTutorial: true }));
  }, [save.seenTutorial, update]);

  return (
    <article className="how">
      <h1 className="page-title">How to play</h1>

      {HOW_TO_PLAY.map((sec, i) => {
        const ex = bySection.get(i);
        if (sec.heading === 'Grades') return null; // shown with the chart below
        return (
          <section key={i} className="how-section">
            <h2 className="h3">{sec.heading}</h2>
            <p>{sec.body}</p>
            {ex && <Example ex={ex} />}
          </section>
        );
      })}

      {leftover.length > 0 && (
        <section className="how-section">
          <h2 className="h3">Examples</h2>
          {leftover.map((ex) => (
            <Example key={ex.id} ex={ex} />
          ))}
        </section>
      )}

      <section className="how-section">
        <h2 className="h3">Grades</h2>
        <p>{HOW_TO_PLAY.find((s) => s.heading === 'Grades')?.body} Your score is how many came back Clear.</p>
        <HydrationChart />
      </section>

      <div className="row row--center">
        <LinkButton href="#/daily" variant="primary" size="lg">
          Play today’s Urinal
        </LinkButton>
        <LinkButton href="#/endless">Endless</LinkButton>
      </div>
    </article>
  );
}
