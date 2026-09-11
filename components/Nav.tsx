"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/solve", label: "Solve" },
  { href: "/play", label: "Play" },
];

const bubbleGlass = {
  background: "rgba(168,85,247,0.08)",
  boxShadow: [
    "inset 0 0 0 1px rgba(168,85,247,0.25)",
    "inset 1px 2px 0px -1px rgba(255,255,255,0.5)",
    "inset -1px -2px 0px -1px rgba(255,255,255,0.3)",
    "0px 2px 12px 0px rgba(168,85,247,0.12)",
  ].join(", "),
};

export default function Nav() {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(headerRef.current, {
        opacity: 0,
        y: -24,
        duration: 0.6,
        ease: "power3.out",
      });
    },
    { scope: headerRef },
  );

  function moveBubble(e: React.MouseEvent<HTMLAnchorElement>) {
    const nav = navRef.current;
    const bubble = bubbleRef.current;
    if (!nav || !bubble) return;
    const navRect = nav.getBoundingClientRect();
    const linkRect = e.currentTarget.getBoundingClientRect();
    gsap.to(bubble, {
      opacity: 1,
      x: linkRect.left - navRect.left + 7,
      width: linkRect.width - 14,
      duration: 0.3,
      ease: "power3.out",
      overwrite: true,
    });
  }

  function hideBubble() {
    gsap.to(bubbleRef.current, { opacity: 0, duration: 0.2, overwrite: true });
  }

  return (
    <header ref={headerRef} className="nav-header fixed top-0 left-0 right-0 z-50">
      <div
        className="flex items-center justify-between"
        style={{ padding: "20px clamp(16px, 4vw, 32px)" }}
      >
        <Link
          href="/"
          className="nav-link-text"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "0.04em",
          }}
        >
          {/* 3×3 grid mark */}
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            {[0, 1, 2].flatMap((r) =>
              [0, 1, 2].map((c) => (
                <rect
                  key={`${r}${c}`}
                  x={c * 7}
                  y={r * 7}
                  width="6"
                  height="6"
                  rx="1"
                  fill={r === 1 && c === 1 ? "#a855f7" : "currentColor"}
                />
              )),
            )}
          </svg>
          Rubics
        </Link>

        <nav
          ref={navRef}
          aria-label="Main navigation"
          className="relative flex items-center gap-1"
          onMouseLeave={hideBubble}
        >
          <div
            ref={bubbleRef}
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 5,
              bottom: 5,
              left: 0,
              width: 0,
              borderRadius: 999,
              opacity: 0,
              pointerEvents: "none",
              ...bubbleGlass,
            }}
          />
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onMouseEnter={moveBubble}
              aria-current={pathname === link.href ? "page" : undefined}
              style={{
                position: "relative",
                padding: "8px clamp(10px, 2vw, 18px)",
                borderRadius: 999,
                textDecoration: "none",
              }}
            >
              <span
                className="nav-link-text"
                style={{
                  position: "relative",
                  zIndex: 1,
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.75rem",
                  letterSpacing: "0.05em",
                  fontWeight: 500,
                }}
              >
                {link.label}
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
