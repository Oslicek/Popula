/**
 * Modal Component Tests (TDD)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

// Helper to check if class name contains a pattern (CSS Modules add hashes)
const hasClassContaining = (element: HTMLElement, pattern: string) => {
  return Array.from(element.classList).some(cls => cls.includes(pattern));
};

describe('Modal', () => {
  beforeEach(() => {
    // Clear body overflow style before each test
    document.body.style.overflow = '';
  });

  afterEach(() => {
    // Clean up body overflow style after each test
    document.body.style.overflow = '';
  });

  describe('rendering', () => {
    it('renders when isOpen is true', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Modal content</p>
        </Modal>
      );

      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={() => {}}>
          <p>Modal content</p>
        </Modal>
      );

      expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
    });

    it('renders title when provided', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal">
          <p>Content</p>
        </Modal>
      );

      expect(screen.getByText('Test Modal')).toBeInTheDocument();
    });

    it('renders close button by default', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test">
          <p>Content</p>
        </Modal>
      );

      expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
    });

    it('hides close button when showCloseButton is false', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} showCloseButton={false}>
          <p>Content</p>
        </Modal>
      );

      expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
    });

    it('renders footer when provided', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} footer={<button>Save</button>}>
          <p>Content</p>
        </Modal>
      );

      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });
  });

  describe('closing behavior', () => {
    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose} title="Test">
          <p>Content</p>
        </Modal>
      );

      fireEvent.click(screen.getByLabelText('Close modal'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when overlay is clicked', () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose}>
          <p>Content</p>
        </Modal>
      );

      fireEvent.click(screen.getByRole('dialog'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when modal content is clicked', () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose}>
          <p>Content</p>
        </Modal>
      );

      fireEvent.click(screen.getByText('Content'));
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not call onClose on overlay click when closeOnOverlayClick is false', () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose} closeOnOverlayClick={false}>
          <p>Content</p>
        </Modal>
      );

      fireEvent.click(screen.getByRole('dialog'));
      expect(onClose).not.toHaveBeenCalled();
    });

    it('calls onClose when ESC is pressed', () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose}>
          <p>Content</p>
        </Modal>
      );

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose on ESC when closeOnEsc is false', () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose} closeOnEsc={false}>
          <p>Content</p>
        </Modal>
      );

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('body scroll lock', () => {
    it('locks body scroll when open', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      );

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('unlocks body scroll when closed', () => {
      const { rerender } = render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      );

      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <Modal isOpen={false} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      );

      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('sizes', () => {
    const sizes = ['sm', 'md', 'lg', 'xl', 'full'] as const;

    sizes.forEach((size) => {
      it(`applies ${size} size class`, () => {
        render(
          <Modal isOpen={true} onClose={() => {}} size={size}>
            <p>Content</p>
          </Modal>
        );

        // Find the modal element (the child of the overlay)
        const overlay = screen.getByRole('dialog');
        const modal = overlay.firstElementChild as HTMLElement;
        expect(hasClassContaining(modal, size)).toBe(true);
      });
    });
  });

  describe('accessibility', () => {
    it('has role="dialog"', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal="true"', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      );

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby when title is provided', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test Title">
          <p>Content</p>
        </Modal>
      );

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'modal-title');
      expect(screen.getByRole('heading', { name: 'Test Title' })).toHaveAttribute('id', 'modal-title');
    });
  });

  describe('contentPadding', () => {
    it('has content class by default', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      );

      const overlay = screen.getByRole('dialog');
      const content = Array.from(overlay.querySelectorAll('*')).find(
        el => hasClassContaining(el as HTMLElement, 'content') && 
              !hasClassContaining(el as HTMLElement, 'contentNoPadding')
      );
      expect(content).toBeTruthy();
    });

    it('removes padding when contentPadding is false', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} contentPadding={false}>
          <p>Content</p>
        </Modal>
      );

      const overlay = screen.getByRole('dialog');
      const noPaddingContent = Array.from(overlay.querySelectorAll('*')).find(
        el => hasClassContaining(el as HTMLElement, 'contentNoPadding')
      );
      expect(noPaddingContent).toBeTruthy();
    });
  });
});
