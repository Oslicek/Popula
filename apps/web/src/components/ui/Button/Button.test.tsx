/**
 * Button Component Tests (TDD)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

// Helper to check if class name contains a pattern (CSS Modules add hashes)
const hasClassContaining = (element: HTMLElement, pattern: string) => {
  return Array.from(element.classList).some(cls => cls.includes(pattern));
};

describe('Button', () => {
  describe('rendering', () => {
    it('renders with children', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button')).toHaveTextContent('Click me');
    });

    it('renders with default variant (primary)', () => {
      render(<Button>Test</Button>);
      expect(hasClassContaining(screen.getByRole('button'), 'primary')).toBe(true);
    });

    it('renders with default size (md)', () => {
      render(<Button>Test</Button>);
      expect(hasClassContaining(screen.getByRole('button'), 'md')).toBe(true);
    });
  });

  describe('variants', () => {
    it('applies primary variant', () => {
      render(<Button variant="primary">Primary</Button>);
      expect(hasClassContaining(screen.getByRole('button'), 'primary')).toBe(true);
    });

    it('applies secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      expect(hasClassContaining(screen.getByRole('button'), 'secondary')).toBe(true);
    });

    it('applies ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);
      expect(hasClassContaining(screen.getByRole('button'), 'ghost')).toBe(true);
    });

    it('applies danger variant', () => {
      render(<Button variant="danger">Danger</Button>);
      expect(hasClassContaining(screen.getByRole('button'), 'danger')).toBe(true);
    });
  });

  describe('sizes', () => {
    it('applies sm size', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      expect(hasClassContaining(button, 'sm')).toBe(true);
    });

    it('applies md size', () => {
      render(<Button size="md">Medium</Button>);
      const button = screen.getByRole('button');
      expect(hasClassContaining(button, 'md')).toBe(true);
    });

    it('applies lg size', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(hasClassContaining(button, 'lg')).toBe(true);
    });
  });

  describe('states', () => {
    it('is disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('is disabled when loading', () => {
      render(<Button loading>Loading</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('shows spinner when loading', () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole('button');
      // Look for spinner element by checking for the loading class
      expect(hasClassContaining(button, 'loading')).toBe(true);
    });
  });

  describe('icons', () => {
    it('renders left icon', () => {
      render(<Button leftIcon={<span data-testid="left-icon">←</span>}>With Icon</Button>);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('renders right icon', () => {
      render(<Button rightIcon={<span data-testid="right-icon">→</span>}>With Icon</Button>);
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('hides icons when loading', () => {
      render(
        <Button loading leftIcon={<span data-testid="left-icon">←</span>}>
          Loading
        </Button>
      );
      expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument();
    });
  });

  describe('modifiers', () => {
    it('applies iconOnly class', () => {
      render(<Button iconOnly>🔍</Button>);
      expect(hasClassContaining(screen.getByRole('button'), 'iconOnly')).toBe(true);
    });

    it('applies fullWidth class', () => {
      render(<Button fullWidth>Full Width</Button>);
      expect(hasClassContaining(screen.getByRole('button'), 'fullWidth')).toBe(true);
    });
  });

  describe('interaction', () => {
    it('calls onClick when clicked', () => {
      const onClick = vi.fn();
      render(<Button onClick={onClick}>Click</Button>);
      fireEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', () => {
      const onClick = vi.fn();
      render(<Button onClick={onClick} disabled>Click</Button>);
      fireEvent.click(screen.getByRole('button'));
      expect(onClick).not.toHaveBeenCalled();
    });

    it('does not call onClick when loading', () => {
      const onClick = vi.fn();
      render(<Button onClick={onClick} loading>Click</Button>);
      fireEvent.click(screen.getByRole('button'));
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('forwards ref to button element', () => {
      const ref = { current: null as HTMLButtonElement | null };
      render(<Button ref={ref}>Test</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it('applies custom className', () => {
      render(<Button className="custom-class">Test</Button>);
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });

    it('passes through native button props', () => {
      render(<Button type="submit" aria-label="Submit form">Submit</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveAttribute('aria-label', 'Submit form');
    });
  });
});
