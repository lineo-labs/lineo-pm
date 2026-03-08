import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";

const videos = [
  {
    src: "/cascade-demo.webm",
    title: "Cascading Dependencies",
    desc: "Move one task — watch every downstream activity cascade in real time.",
  },
  {
    src: "/scenario-demo.webm",
    title: "Scenario Engine",
    desc: "Create alternative timelines, compare them against the baseline and promote the best plan.",
  },
  {
    src: "/risk-adjusted-demo.webm",
    title: "Risk-Adjusted Planning",
    desc: "Run Monte Carlo simulations and automatically generate risk-buffered schedules.",
  },
];

export default function VideoCarousel() {
  const [current, setCurrent] = useState(0);
  const videoRef = useRef(null);
  const { basePath } = useRouter();

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.load();
    el.play().catch(() => {});
  }, [current]);

  const goTo = (i) => setCurrent(i);
  const goNext = () => setCurrent((c) => (c + 1) % videos.length);
  const goPrev = () => setCurrent((c) => (c - 1 + videos.length) % videos.length);

  const v = videos[current];

  return (
    <div style={{ marginTop: "2rem", marginBottom: "2rem" }}>
      {/* Title + description */}
      <div style={{ marginBottom: "0.75rem", textAlign: "center" }}>
        <div style={{ fontSize: "1rem", fontWeight: 600, color: "#f1f5f9" }}>{v.title}</div>
        <div style={{ marginTop: "0.25rem", fontSize: "0.875rem", color: "#94a3b8" }}>{v.desc}</div>
      </div>

      {/* Video */}
      <div style={{
        position: "relative",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 24px 48px rgba(0,0,0,0.5)",
      }}>
        <video
          ref={videoRef}
          key={v.src}
          autoPlay
          muted
          playsInline
          onEnded={goNext}
          style={{ width: "100%", display: "block" }}
        >
          <source src={`${basePath}${v.src}`} type="video/webm" />
        </video>
        {/* Vignette */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "12px", pointerEvents: "none",
          background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.7) 100%)",
        }} />

        {/* Prev / Next arrows */}
        <button
          onClick={goPrev}
          aria-label="Previous"
          style={{
            position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)",
            background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer",
            color: "#f1f5f9", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >‹</button>
        <button
          onClick={goNext}
          aria-label="Next"
          style={{
            position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
            background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer",
            color: "#f1f5f9", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >›</button>
      </div>

      {/* Dot indicators */}
      <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "12px" }}>
        {videos.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to video ${i + 1}`}
            style={{
              width: i === current ? "24px" : "8px",
              height: "8px",
              borderRadius: "9999px",
              background: i === current ? "#6366f1" : "rgba(148,163,184,0.35)",
              border: "none",
              cursor: "pointer",
              padding: 0,
              transition: "width 0.2s ease, background 0.2s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}
