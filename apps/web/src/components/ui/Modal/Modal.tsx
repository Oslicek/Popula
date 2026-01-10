/**
 * Modal Component
 * 
 * Accessible modal dialog with backdrop
 */

import { useEffect, useCallback, type ReactNode, type MouseEvent, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: ModalSize;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  showCloseButton?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  footerAlign?: 'left' | 'right' | 'space-between';
  contentPadding?: boolean;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEsc = true,
  showCloseButton = true,
  children,
  footer,
  footerAlign = 'right',
  contentPadding = true,
  className,
}: ModalProps) {
  // Handle ESC key
  const handleKeyDown = useCallback(
    (event: globalThis.KeyboardEvent) => {
      if (closeOnEsc && event.key === 'Escape') {
        onClose();
      }
    },
    [closeOnEsc, onClose]
  );

  // Add/remove event listeners
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  // Handle overlay click
  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  // Handle close button click
  const handleCloseClick = () => {
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  const modalClassNames = [
    styles.modal,
    styles[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const contentClassNames = [
    styles.content,
    !contentPadding && styles.contentNoPadding,
  ]
    .filter(Boolean)
    .join(' ');

  const footerClassNames = [
    styles.footer,
    footerAlign === 'left' && styles.footerLeft,
    footerAlign === 'space-between' && styles.footerSpaceBetween,
  ]
    .filter(Boolean)
    .join(' ');

  const modalContent = (
    <div
      className={styles.overlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div className={modalClassNames}>
        {(title || showCloseButton) && (
          <div className={styles.header}>
            {title && (
              <h2 id="modal-title" className={styles.title}>
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                className={styles.closeButton}
                onClick={handleCloseClick}
                aria-label="Close modal"
              >
                ✕
              </button>
            )}
          </div>
        )}

        <div className={contentClassNames}>{children}</div>

        {footer && <div className={footerClassNames}>{footer}</div>}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
