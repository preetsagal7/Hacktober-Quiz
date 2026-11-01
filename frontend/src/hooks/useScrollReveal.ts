/**
 * useScrollReveal — lightweight Intersection Observer hook.
 * Adds `data-revealed="true"` when element enters viewport.
 * CSS drives all animation; zero runtime cost after trigger.
 */
import { useEffect, useRef } from 'react';

interface UseScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

export function useScrollReveal(
  options: UseScrollRevealOptions = {}
): React.RefObject<HTMLElement | null> {
  const { threshold = 0.12, rootMargin = '0px 0px -40px 0px', once = true } = options;
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced-motion preference — reveal immediately
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      el.setAttribute('data-revealed', 'true');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-revealed', 'true');
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            entry.target.removeAttribute('data-revealed');
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return ref as React.RefObject<HTMLElement | null>;
}

/** Reveal all children with staggered delay using a parent observer */
export function useStaggerReveal(
  childSelector: string,
  options: UseScrollRevealOptions & { staggerMs?: number } = {}
): React.RefObject<HTMLElement | null> {
  const {
    threshold = 0.08,
    rootMargin = '0px 0px -30px 0px',
    once = true,
    staggerMs = 80,
  } = options;
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const children = Array.from(container.querySelectorAll<HTMLElement>(childSelector));

    if (prefersReduced) {
      children.forEach((child) => child.setAttribute('data-revealed', 'true'));
      return;
    }

    // Set stagger delays up front
    children.forEach((child, i) => {
      child.style.setProperty('--stagger-delay', `${i * staggerMs}ms`);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            children.forEach((child) => child.setAttribute('data-revealed', 'true'));
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            children.forEach((child) => child.removeAttribute('data-revealed'));
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [childSelector, threshold, rootMargin, once, staggerMs]);

  return ref as React.RefObject<HTMLElement | null>;
}
