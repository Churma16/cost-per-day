import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import WorthwhileBrandLockup from '../../src/components/WorthwhileBrandLockup';

describe('WorthwhileBrandLockup', () => {
  test('renders the shared Worthwhile identity with stable visual proportions', () => {
    render(<WorthwhileBrandLockup className="test-placement" />);

    const lockup = screen.getByLabelText('Worthwhile');
    const wordmark = screen.getByText('Worthwhile');
    const logo = lockup.querySelector('img');

    expect(lockup).toHaveClass('inline-flex', 'items-center', 'gap-2', 'test-placement');
    expect(logo).toHaveAttribute('src', '/worthwhile-icon-192-v2.png');
    expect(logo).toHaveAttribute('alt', '');
    expect(wordmark).toHaveClass(
      'text-xl',
      'font-semibold',
      'leading-6',
      'tracking-[-0.015em]'
    );
  });
});
