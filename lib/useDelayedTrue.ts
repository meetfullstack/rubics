"use client";

import { useEffect, useState } from "react";

/**
 * Returns true only once `delay` ms have passed. Used to hide a loading
 * placeholder for fast loads — showing it immediately just for it to vanish
 * a moment later reads as a flash rather than a loading state.
 */
export function useDelayedTrue(delay = 200) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return show;
}
