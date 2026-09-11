"use client";

import { useTheme } from "next-themes";
import {
  useState,
  useRef,
  useSyncExternalStore,
  useEffect,
  useLayoutEffect,
} from "react";
import gsap from "gsap";

const SunIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const ArrowUpIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
);

const glass = {
  background: "rgba(180,180,180,0.12)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  boxShadow: [
    "inset 0 0 0 1px rgba(255,255,255,0.15)",
    "inset 2px 3px 0px -2px rgba(255,255,255,0.7)",
    "inset -2px -2px 0px -2px rgba(255,255,255,0.5)",
    "0px 4px 12px 0px rgba(0,0,0,0.1)",
    "0px 8px 32px 0px rgba(0,0,0,0.1)",
  ].join(", "),
};

const BTN = 36;
const PAD = 8;
const GAP = 4;
const H = 52;

// Icon slide logic (derived from isDark × hovered):
//
//   state              sun pos   moon pos   visible
//   light + no-hover     0        -BTN       sun
//   light + hover       +BTN       0         moon  ← preview dark
//   dark  + no-hover   +BTN        0         moon
//   dark  + hover        0        -BTN       sun   ← preview light
//
// sun  at 0 when isDark === hovered,  else +BTN
// moon at 0 when isDark !== hovered,  else -BTN
//
// Directions: light→dark hover: sun exits RIGHT, moon enters from LEFT
//             dark→light hover: moon exits LEFT,  sun enters from RIGHT

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [hovered, setHovered] = useState(false);
  const [pillHovered, setPillHovered] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const pillRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef<HTMLDivElement>(null);
  const moonRef = useRef<HTMLDivElement>(null);
  const isFirstAnim = useRef(true);

  const isDark = resolvedTheme === "dark";

  // 30% scroll depth
  useEffect(() => {
    const check = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrolled(max > 0 && window.scrollY / max >= 0.3);
    };
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);

  // Pill width: expands ONLY for scroll (to reveal up arrow)
  useEffect(() => {
    if (!pillRef.current) return;
    const w = scrolled ? PAD * 2 + BTN * 2 + GAP : H;
    gsap.to(pillRef.current, { width: w, duration: 0.4, ease: "power4.inOut" });
  }, [scrolled]);

  // Icon slide animation — no expansion on hover, just swap in place
  // mounted in deps so the initial gsap.set runs after the DOM exists
  useLayoutEffect(() => {
    if (!sunRef.current || !moonRef.current) return;
    const sunX = isDark !== hovered ? BTN : 0;
    const moonX = isDark !== hovered ? 0 : -BTN;

    if (isFirstAnim.current) {
      isFirstAnim.current = false;
      gsap.set(sunRef.current, { x: sunX });
      gsap.set(moonRef.current, { x: moonX });
    } else {
      gsap.to(sunRef.current, { x: sunX, duration: 0.3, ease: "power3.out" });
      gsap.to(moonRef.current, { x: moonX, duration: 0.3, ease: "power3.out" });
    }
  }, [isDark, hovered, mounted]);

  if (!mounted) return null;

  // Purple ONLY while hovering (on the visible icon). Default is text-primary.
  // sun is visible when isDark && hovered (dark+hover shows sun as light preview)
  // moon is visible when !isDark && hovered (light+hover shows moon as dark preview)
  const sunColor = isDark && hovered ? "#a855f7" : "var(--text-primary)";
  const moonColor = !isDark && hovered ? "#a855f7" : "var(--text-primary)";

  return (
    <div
      style={{
        position: "fixed",
        bottom: "2rem",
        right: "2rem",
        zIndex: 100,
        opacity: pillHovered ? 1 : 0.5,
        transition: "opacity 0.3s ease",
      }}
      onMouseEnter={() => setPillHovered(true)}
      onMouseLeave={() => setPillHovered(false)}
    >
      <div
        ref={pillRef}
        style={{
          width: H,
          height: H,
          overflow: "hidden",
          position: "relative",
          borderRadius: 999,
          ...glass,
        }}
      >
        {/* Theme button: hover/leave ONLY here — arrow must not trigger the slide */}
        <button
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={() => {
            setTheme(isDark ? "light" : "dark");
            setHovered(false); // reset so new theme icon settles without reversing
          }}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          style={{
            position: "absolute",
            left: PAD,
            top: (H - BTN) / 2,
            width: BTN,
            height: BTN,
            overflow: "hidden",
            borderRadius: 999,
            border: "none",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          <div
            ref={sunRef}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: sunColor,
              transition: "color 0.25s",
            }}
          >
            <SunIcon />
          </div>
          <div
            ref={moonRef}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: moonColor,
              transition: "color 0.25s",
            }}
          >
            <MoonIcon />
          </div>
        </button>

        {/* Up arrow: always in DOM, revealed when pill expands on scroll */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          style={{
            position: "absolute",
            left: PAD + BTN + GAP,
            top: (H - BTN) / 2,
            width: BTN,
            height: BTN,
            borderRadius: 999,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-primary)",
          }}
        >
          <ArrowUpIcon />
        </button>
      </div>
    </div>
  );
}
