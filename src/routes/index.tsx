import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import heroImage from "@/assets/zenith-hero.jpg";

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

function Index() {
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
    const schedule = () => {
      const delay = 3500 + Math.random() * 5500;
      return window.setTimeout(() => {
        const next = {
          id: id++,
          top: Math.random() * 40,
          left: Math.random() * 70,
          angle: 15 + Math.random() * 25,
          length: 140 + Math.random() * 180,
          duration: 1.1 + Math.random() * 0.9,
        };
        setShootingStars((prev) => [...prev.slice(-2), next]);
        window.setTimeout(() => {
          setShootingStars((prev) => prev.filter((s) => s.id !== next.id));
        }, next.duration * 1000 + 200);
        timer = schedule();
      }, delay);
    };
    let timer = schedule();
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="hero-scene">
      <img
        src={heroImage}
        alt="Two children gazing up at a star-filled night sky beside a telescope on a grassy hill"
        className="hero-image"
        width={1920}
        height={1088}
      />
      <div className="hero-vignette" aria-hidden="true" />

      {/* Twinkling stars */}
      <div className="star-layer" aria-hidden="true">
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

      {/* Shooting stars */}
      <div className="shooting-layer" aria-hidden="true">
        {shootingStars.map((s) => (
          <span
            key={s.id}
            className="shooting-star"
            style={{
              top: `${s.top}%`,
              left: `${s.left}%`,
              width: `${s.length}px`,
              transform: `rotate(${s.angle}deg)`,
              animationDuration: `${s.duration}s`,
            }}
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
        <span className="cta-text">Scroll to Explore</span>
        <span className="cta-chevron" aria-hidden="true" />
      </footer>
    </main>
  );
}
