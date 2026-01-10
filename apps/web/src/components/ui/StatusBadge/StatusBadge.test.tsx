/**
 * StatusBadge Component Tests (TDD)
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge, type StatusType } from './StatusBadge';

// Helper to check if class name contains a pattern (CSS Modules add hashes)
const hasClassContaining = (element: HTMLElement, pattern: string) => {
  return Array.from(element.classList).some(cls => cls.includes(pattern));
};

describe('StatusBadge', () => {
  describe('rendering', () => {
    it('renders with status text', () => {
      render(<StatusBadge status="done" />);
      expect(screen.getByText('Done')).toBeInTheDocument();
    });

    it('renders with custom label', () => {
      render(<StatusBadge status="done" label="Completed" />);
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('renders dot indicator by default', () => {
      const { container } = render(<StatusBadge status="running" />);
      // Look for an element with class containing 'dot'
      const dot = Array.from(container.querySelectorAll('*')).find(
        el => hasClassContaining(el as HTMLElement, 'dot')
      );
      expect(dot).toBeTruthy();
    });

    it('hides dot when showDot is false', () => {
      const { container } = render(<StatusBadge status="running" showDot={false} />);
      const dot = Array.from(container.querySelectorAll('*')).find(
        el => hasClassContaining(el as HTMLElement, 'dot')
      );
      expect(dot).toBeFalsy();
    });

    it('hides dot when icon is provided', () => {
      const { container } = render(<StatusBadge status="running" icon={<span>✓</span>} />);
      const dot = Array.from(container.querySelectorAll('*')).find(
        el => hasClassContaining(el as HTMLElement, 'dot')
      );
      expect(dot).toBeFalsy();
    });
  });

  describe('status variants', () => {
    const statuses: StatusType[] = ['queued', 'running', 'done', 'failed', 'pending', 'cancelled'];

    statuses.forEach((status) => {
      it(`applies ${status} class`, () => {
        const { container } = render(<StatusBadge status={status} />);
        const badge = container.firstChild as HTMLElement;
        expect(hasClassContaining(badge, status)).toBe(true);
      });
    });
  });

  describe('default labels', () => {
    it('shows "Queued" for queued status', () => {
      render(<StatusBadge status="queued" />);
      expect(screen.getByText('Queued')).toBeInTheDocument();
    });

    it('shows "Running" for running status', () => {
      render(<StatusBadge status="running" />);
      expect(screen.getByText('Running')).toBeInTheDocument();
    });

    it('shows "Done" for done status', () => {
      render(<StatusBadge status="done" />);
      expect(screen.getByText('Done')).toBeInTheDocument();
    });

    it('shows "Failed" for failed status', () => {
      render(<StatusBadge status="failed" />);
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    it('shows "Pending" for pending status', () => {
      render(<StatusBadge status="pending" />);
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('shows "Cancelled" for cancelled status', () => {
      render(<StatusBadge status="cancelled" />);
      expect(screen.getByText('Cancelled')).toBeInTheDocument();
    });
  });

  describe('sizes', () => {
    it('applies sm size', () => {
      const { container } = render(<StatusBadge status="done" size="sm" />);
      const badge = container.firstChild as HTMLElement;
      expect(hasClassContaining(badge, 'sm')).toBe(true);
    });

    it('applies md size by default', () => {
      const { container } = render(<StatusBadge status="done" />);
      const badge = container.firstChild as HTMLElement;
      expect(hasClassContaining(badge, 'md')).toBe(true);
    });

    it('applies lg size', () => {
      const { container } = render(<StatusBadge status="done" size="lg" />);
      const badge = container.firstChild as HTMLElement;
      expect(hasClassContaining(badge, 'lg')).toBe(true);
    });
  });

  describe('icon', () => {
    it('renders custom icon', () => {
      render(<StatusBadge status="done" icon={<span data-testid="custom-icon">✓</span>} />);
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('applies custom className', () => {
      const { container } = render(<StatusBadge status="done" className="custom-class" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('custom-class');
    });
  });
});
