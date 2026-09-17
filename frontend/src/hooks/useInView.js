import { useState, useEffect, useRef } from "react";

/**
 * ============================================================================
 * USE IN VIEW INTERSECTION OBSERVER HOOK (useInView.js)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Returns a React ref and boolean `isInView` state that becomes `true` when
 * the observed element scrolls into the visible browser viewport.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Performant Scroll Reveals: Replaces window scroll event listeners with native
 *    `IntersectionObserver` API to avoid scroll jank or layout thrashing.
 * 2. `triggerOnce` Default: Once an element animates into view, it stays visible
 *    without re-triggering animations on reverse scroll.
 * 
 * HOW IT WORKS:
 * - Attaches observer to `ref.current`.
 * - When `isIntersecting` threshold (default 15%) is met, updates state to `true`.
 * 
 * @param {Object} options Configuration options
 * @param {number} options.threshold Portions of target visible (0.0 to 1.0)
 * @param {boolean} options.triggerOnce Whether to unobserve after first reveal
 * @returns {[React.RefObject, boolean]} Array of [ref, isInView]
 */
export function useInView({ threshold = 0.15, triggerOnce = true } = {}) {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Fallback for environments where IntersectionObserver is missing
    if (!("IntersectionObserver" in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (triggerOnce) {
            observer.unobserve(node);
          }
        } else if (!triggerOnce) {
          setIsInView(false);
        }
      },
      { threshold }
    );

    observer.observe(node);

    return () => {
      if (node) observer.unobserve(node);
    };
  }, [threshold, triggerOnce]);

  return [ref, isInView];
}

export default useInView;
