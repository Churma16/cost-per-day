import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CalmCollapse, {
  CALM_COLLAPSE_DURATION,
  CALM_HEIGHT_EASE,
} from '../../../src/components/ui/CalmCollapse';

describe('CalmCollapse', () => {
  it('keeps the shared calm height motion within the deliberate disclosure range', () => {
    expect(CALM_COLLAPSE_DURATION).toEqual({
      expand: 0.58,
      collapse: 0.5,
      fadeIn: 0.34,
      fadeOut: 0.24,
    });
    expect(CALM_HEIGHT_EASE).toEqual([0.22, 1, 0.36, 1]);
  });

  it('mounts open content and safely removes it after the exit glide', async () => {
    const { rerender } = render(
      <CalmCollapse isOpen id="details" ariaLabelledby="trigger">
        <button type="button">Edit</button>
      </CalmCollapse>
    );

    const region = screen.getByRole('region');
    expect(region).toHaveAttribute('aria-labelledby', 'trigger');
    expect(region).not.toHaveAttribute('inert');

    rerender(
      <CalmCollapse isOpen={false} id="details" ariaLabelledby="trigger">
        <button type="button">Edit</button>
      </CalmCollapse>
    );

    expect(region).toHaveAttribute('aria-hidden', 'true');
    expect(region).toHaveAttribute('inert');
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();

    await waitFor(() => {
      expect(document.getElementById('details')).not.toBeInTheDocument();
    }, { timeout: 1200 });
  });
});
