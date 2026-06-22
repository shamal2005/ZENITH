import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import heroImage from "@/assets/zenith-hero.jpg";
import GlobeView from "../components/GlobeView";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ZENITH — The Celestial Eye" },
      {
        name: "description",
        content:
          "ZENITH — The Celestial Eye. A quiet hill, a telescope, and a sky full of wonder.",
      },
      { property: "og:title", content: "ZENITH — The Celestial Eye" },
      {
        property: "og:description",
        content: "A cinematic opening to a journey through the night sky.",
      },
    ],
  }),
  component: Index,
});

type Star = { x: number; y: number; size: number; delay: number; duration: number };
type Firefly = { x: number; y: number; delay: number; duration: number; drift: number };

const TRANSITION_DURATION_MS = 2200;

interface IndexProps {
  onComplete?: () => void;
}

function Index({ onComplete }: IndexProps = {}) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showGlobe, setShowGlobe] = useState(false);
  const isTransitioningRef = useRef(false);

  // Sync ref with state to access inside the static schedule closure
  useEffect(() => {
    isTransitioningRef.current = isTransitioning;
  }, [isTransitioning]);

  const stars = useMemo<Star[]>(
    () =>
      Array.from({ length: 140 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 75,
        size: Math.random() * 1.6 + 0.4,
        delay: Math.random() * 6,
        duration: Math.random() * 4 + 3,
      })),
    [],
  );

  const fireflies = useMemo<Firefly[]>(
    () =>
      Array.from({ length: 9 }, () => ({
        x: Math.random() * 100,
        y: 78 + Math.random() * 18,
        delay: Math.random() * 6,
        duration: Math.random() * 4 + 5,
        drift: (Math.random() - 0.5) * 30,
      })),
    [],
  );

  // Shooting stars: schedule a new one every few seconds
  const [shootingStars, setShootingStars] = useState<
    { id: number; top: number; left: number; angle: number; length: number; duration: number }[]
  >([]);

  useEffect(() => {
    let id = 0;
    let timer: number;
    const schedule = () => {
      const delay = 2500 + Math.random() * 4000;
      timer = window.setTimeout(() => {
        if (isTransitioningRef.current) {
          // Stop scheduling new shooting stars
          return;
        }
        const goingRight = Math.random() > 0.5;
        const next = {
          id: id++,
          top: 5 + Math.random() * 35,
          left: goingRight ? 5 + Math.random() * 30 : 60 + Math.random() * 30,
          angle: goingRight ? 18 + Math.random() * 20 : 160 - Math.random() * 20,
          length: 180 + Math.random() * 220,
          duration: 1.2 + Math.random() * 0.8,
        };
        setShootingStars((prev) => [...prev.slice(-2), next]);
        window.setTimeout(() => {
          setShootingStars((prev) => prev.filter((s) => s.id !== next.id));
        }, next.duration * 1000 + 200);
        schedule();
      }, delay);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, []);

  const handleStartTransition = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    setTimeout(() => {
      setShowGlobe(true);
      onComplete?.();
    }, TRANSITION_DURATION_MS);
  };

  return (
    <>
      <main 
        className={`hero-scene${isTransitioning ? " transitioning" : ""}`}
        onClick={handleStartTransition}
      >
        <img
          src={heroImage}
          alt="Two children gazing up at a star-filled night sky beside a telescope on a grassy hill"
          className="hero-image"
          width={1920}
          height={1088}
        />
        <div className="hero-vignette" aria-hidden="true" />

        {/* Starfield Container for Zoom Transition */}
        <div className="starfield-container" aria-hidden="true">
          {/* Twinkling stars */}
          <div className="star-layer">
            {stars.map((s, i) => (
              <span
                key={i}
                className="star"
                style={{
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  width: `${s.size}px`,
                  height: `${s.size}px`,
                  animationDelay: `${s.delay}s`,
                  animationDuration: `${s.duration}s`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Shooting stars */}
        <div className="shooting-layer" aria-hidden="true">
          {shootingStars.map((s) => (
            <span
              key={s.id}
              className="shooting-star"
              style={
                {
                  top: `${s.top}%`,
                  left: `${s.left}%`,
                  width: `${s.length}px`,
                  animationDuration: `${s.duration}s`,
                  ["--angle" as never]: `${s.angle}deg`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        {/* Fireflies + grass shimmer */}
        <div className="firefly-layer" aria-hidden="true">
          {fireflies.map((f, i) => (
            <span
              key={i}
              className="firefly"
              style={
                {
                  left: `${f.x}%`,
                  top: `${f.y}%`,
                  animationDelay: `${f.delay}s`,
                  animationDuration: `${f.duration}s`,
                  ["--drift" as never]: `${f.drift}px`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        {/* Grass breeze overlay — subtle horizontal sway of foreground */}
        <div className="grass-breeze" aria-hidden="true" />

        {/* UI */}
        <header className="hero-brand">
          <h1 className="brand-title">ZENITH</h1>
          <p className="brand-sub">The Celestial Eye</p>
        </header>

        <footer className="hero-cta">
          <span className="cta-text">Click to explore</span>
          <span className="cta-chevron" aria-hidden="true" />
        </footer>
      </main>

      <div className={`globe-view-container${showGlobe ? " visible" : ""}`}>
        {showGlobe && <GlobeView />}
      </div>
    </>
  );
}
