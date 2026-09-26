import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { IoCashOutline, IoCreateOutline } from 'react-icons/io5';
import CollapsibleCard from '../../../src/components/ui/CollapsibleCard';
import InfoTile from '../../../src/components/ui/InfoTile';
import ActionButton from '../../../src/components/ui/ActionButton';

describe('UI Primitives', () => {
  describe('CollapsibleCard', () => {
    it('renders header and handles toggle click', () => {
      const handleToggle = vi.fn();
      render(
        <CollapsibleCard
          id="test-card"
          isExpanded={false}
          onToggle={handleToggle}
          header={<span>Card Header</span>}
        >
          <div>Card Content</div>
        </CollapsibleCard>
      );

      const trigger = screen.getByRole('button', { name: /card header/i });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveAttribute('aria-controls', 'card-content-test-card');

      fireEvent.click(trigger);
      expect(handleToggle).toHaveBeenCalledTimes(1);

      const contentRegion = document.getElementById('card-content-test-card');
      expect(contentRegion).toHaveAttribute('aria-hidden', 'true');
    });

    it('displays expanded region when isExpanded is true', () => {
      render(
        <CollapsibleCard
          id="test-card"
          isExpanded={true}
          onToggle={vi.fn()}
          header={<span>Header</span>}
        >
          <div>Visible Content</div>
        </CollapsibleCard>
      );

      const contentRegion = document.getElementById('card-content-test-card');
      expect(contentRegion).toHaveAttribute('aria-hidden', 'false');
      expect(screen.getByText('Visible Content')).toBeInTheDocument();
    });
  });

  describe('InfoTile', () => {
    it('renders icon, label, value, and optional subValue', () => {
      render(
        <InfoTile
          icon={IoCashOutline}
          label="Target price"
          value="Rp 1.000.000"
          subValue="~30 days"
        />
      );

      expect(screen.getByText('Target price')).toBeInTheDocument();
      expect(screen.getByText('Rp 1.000.000')).toBeInTheDocument();
      expect(screen.getByText('~30 days')).toBeInTheDocument();
    });
  });

  describe('ActionButton', () => {
    it('renders secondary variant by default and triggers click', () => {
      const handleClick = vi.fn();
      render(
        <ActionButton icon={IoCreateOutline} onClick={handleClick}>
          Edit
        </ActionButton>
      );

      const button = screen.getByRole('button', { name: 'Edit' });
      expect(button).toHaveClass('bg-[#F6F7F8]');
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders danger variant with red styling', () => {
      render(
        <ActionButton variant="danger">
          Delete
        </ActionButton>
      );

      const button = screen.getByRole('button', { name: 'Delete' });
      expect(button).toHaveClass('text-red-600');
    });
  });

  describe('PageHeader', () => {
    it('renders title and optional subtitle', async () => {
      const { PageHeader } = await import('../../../src/components/ui/PageHeader');
      render(
        <PageHeader
          title="Planned Purchases"
          subtitle="Understand price through time"
        />
      );

      expect(screen.getByRole('heading', { level: 1, name: 'Planned Purchases' })).toBeInTheDocument();
      expect(screen.getByText('Understand price through time')).toBeInTheDocument();
    });
  });
});
