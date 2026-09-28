import { useEffect, useRef, useState } from 'react';

export const LOADING_SKELETON_DELAY_MS = 200;
export const LOADING_SLOW_DELAY_MS = 2000;
export const LOADING_SKELETON_MIN_MS = 300;

export function useLoadingPhases(
  active,
  {
    skeletonDelayMs = LOADING_SKELETON_DELAY_MS,
    slowDelayMs = LOADING_SLOW_DELAY_MS,
    minimumSkeletonMs = LOADING_SKELETON_MIN_MS,
  } = {},
) {
  const [phase, setPhase] = useState(active ? 'blank' : 'idle');
  const skeletonShownAtRef = useRef(null);
  const releaseTimerRef = useRef(null);

  useEffect(() => {
    if (releaseTimerRef.current) {
      window.clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = null;
    }

    if (!active) {
      if (skeletonShownAtRef.current === null) {
        setPhase('idle');
        return undefined;
      }

      const elapsed = Date.now() - skeletonShownAtRef.current;
      const remaining = Math.max(0, minimumSkeletonMs - elapsed);

      if (remaining === 0) {
        skeletonShownAtRef.current = null;
        setPhase('idle');
        return undefined;
      }

      releaseTimerRef.current = window.setTimeout(() => {
        releaseTimerRef.current = null;
        skeletonShownAtRef.current = null;
        setPhase('idle');
      }, remaining);

      return () => {
        if (releaseTimerRef.current) {
          window.clearTimeout(releaseTimerRef.current);
          releaseTimerRef.current = null;
        }
      };
    }

    skeletonShownAtRef.current = null;
    setPhase('blank');

    const skeletonTimer = window.setTimeout(() => {
      skeletonShownAtRef.current = Date.now();
      setPhase('skeleton');
    }, skeletonDelayMs);

    const slowTimer = window.setTimeout(() => {
      if (skeletonShownAtRef.current === null) {
        skeletonShownAtRef.current = Date.now();
      }
      setPhase('slow');
    }, slowDelayMs);

    return () => {
      window.clearTimeout(skeletonTimer);
      window.clearTimeout(slowTimer);
    };
  }, [active, minimumSkeletonMs, skeletonDelayMs, slowDelayMs]);

  useEffect(() => () => {
    if (releaseTimerRef.current) {
      window.clearTimeout(releaseTimerRef.current);
    }
  }, []);

  return {
    phase,
    isBlank: phase === 'blank',
    showSkeleton: phase === 'skeleton' || phase === 'slow',
    showSlowIndicator: phase === 'slow',
    isHolding: !active && phase !== 'idle',
  };
}

export function useSlowAction(active, delayMs = LOADING_SLOW_DELAY_MS) {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    setIsSlow(false);
    if (!active) return undefined;

    const timer = window.setTimeout(() => setIsSlow(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [active, delayMs]);

  return isSlow;
}
