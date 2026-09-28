import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  LOADING_SKELETON_DELAY_MS,
  LOADING_SKELETON_MIN_MS,
  LOADING_SLOW_DELAY_MS,
  useLoadingPhases,
} from '../../src/hooks/useLoadingPhases';

describe('useLoadingPhases', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('stays blank for 200ms, then shows a skeleton, then enters slow loading at 2s', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useLoadingPhases(true));

    expect(result.current.phase).toBe('blank');

    act(() => {
      vi.advanceTimersByTime(LOADING_SKELETON_DELAY_MS - 1);
    });
    expect(result.current.phase).toBe('blank');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.phase).toBe('skeleton');

    act(() => {
      vi.advanceTimersByTime(LOADING_SLOW_DELAY_MS - LOADING_SKELETON_DELAY_MS);
    });
    expect(result.current.phase).toBe('slow');
    expect(result.current.showSlowIndicator).toBe(true);
  });

  it('keeps a shown skeleton visible for at least 300ms before content can replace it', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ active }) => useLoadingPhases(active),
      { initialProps: { active: true } },
    );

    act(() => {
      vi.advanceTimersByTime(LOADING_SKELETON_DELAY_MS);
    });
    expect(result.current.phase).toBe('skeleton');

    act(() => {
      vi.advanceTimersByTime(50);
    });
    rerender({ active: false });
    expect(result.current.phase).toBe('skeleton');

    act(() => {
      vi.advanceTimersByTime(LOADING_SKELETON_MIN_MS - 51);
    });
    expect(result.current.phase).toBe('skeleton');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.phase).toBe('idle');
  });

  it('never flashes a skeleton when loading resolves before 200ms', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ active }) => useLoadingPhases(active),
      { initialProps: { active: true } },
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ active: false });

    expect(result.current.phase).toBe('idle');

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.phase).toBe('idle');
  });
});
