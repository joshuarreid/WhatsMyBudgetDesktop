import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import './Modal.css';
import useLockBodyScroll from './useLockBodyScroll';
import useFocusTrap from './useFocusTrap';

const logger = {
    info: (...args) => console.log('[Modal]', ...args),
    error: (...args) => console.error('[Modal]', ...args),
};

/**
 * Small LIFO stack to help manage z-index ordering when multiple modals are open.
 * This is intentionally tiny — for complex apps consider a ModalProvider.
 */
const modalStack = [];
function pushModal(id) {
    modalStack.push(id);
    return modalStack.length;
}
function popModal(id) {
    const idx = modalStack.lastIndexOf(id);
    if (idx >= 0) modalStack.splice(idx, 1);
    return modalStack.length;
}

/**
 * Shared Modal component (accessible, portal, focus trap, body-lock).
 *
 * Props:
 *  - isOpen: boolean (required)
 *  - onClose: function (required)
 *  - closeOnBackdrop: boolean (default true)
 *  - closeOnEsc: boolean (default true)
 *  - ariaLabel / ariaLabelledBy: for accessibility
 *  - portalTarget: HTMLElement to render portal into (defaults to #modals-root or document.body)
 */
export default function Modal({
                                  isOpen,
                                  onClose,
                                  children,
                                  closeOnBackdrop = true,
                                  closeOnEsc = true,
                                  ariaLabel,
                                  ariaLabelledBy,
                                  className = '',
                                  portalTarget = null,
                              }) {
    const idRef = useRef(`modal-${Math.random().toString(36).slice(2, 9)}`);
    const dialogRef = useRef(null);
    const backdropRef = useRef(null);

    // pick portal target lazily (safe for SSR)
    const resolvedPortalTarget =
        portalTarget ||
        (typeof document !== 'undefined'
            ? document.getElementById('modals-root') || document.body
            : null);

    // lock scroll and trap focus when open
    useLockBodyScroll(isOpen);
    useFocusTrap(dialogRef, isOpen);

    useEffect(() => {
        if (!isOpen) return undefined;
        const id = idRef.current;
        const order = pushModal(id);
        logger.info('open', { id, order });

        function onKey(e) {
            if (!closeOnEsc) return;
            // only top-most modal responds to ESC
            if (e.key === 'Escape' && modalStack[modalStack.length - 1] === id) {
                logger.info('escape pressed -> onClose', { id });
                onClose?.();
            }
        }

        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            const remaining = popModal(id);
            logger.info('cleanup', { id, remaining });
        };
    }, [isOpen, closeOnEsc, onClose]);

    if (!isOpen || !resolvedPortalTarget) return null;

    function handleBackdropMouseDown(e) {
        // close only when clicking the backdrop itself, not when clicking inside dialog
        if (!closeOnBackdrop) return;
        if (e.target === backdropRef.current) {
            logger.info('backdrop click -> onClose', { id: idRef.current });
            onClose?.();
        }
    }

    // z-index grows with stack depth to avoid overlap problems
    const zIndexBase = 1000 + modalStack.length * 2;

    return ReactDOM.createPortal(
        <div
            className={`modal-backdrop ${className}`}
            ref={backdropRef}
            onMouseDown={handleBackdropMouseDown}
            style={{ zIndex: zIndexBase }}
            aria-hidden="false"
        >
            <div
                ref={dialogRef}
                className="modal"
                role="dialog"
                aria-modal="true"
                aria-label={ariaLabel}
                aria-labelledby={ariaLabelledBy}
                tabIndex={-1}
                style={{ zIndex: zIndexBase + 1 }}
            >
                {children}
            </div>
        </div>,
        resolvedPortalTarget,
    );
}

Modal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    children: PropTypes.node,
    closeOnBackdrop: PropTypes.bool,
    closeOnEsc: PropTypes.bool,
    ariaLabel: PropTypes.string,
    ariaLabelledBy: PropTypes.string,
    className: PropTypes.string,
    portalTarget: PropTypes.any,
};

/* --- Composition primitives --- */

export function ModalHeader({ children, className = '' }) {
    return <div className={`modal-header ${className}`}>{children}</div>;
}
ModalHeader.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
};

export function ModalBody({ children, className = '' }) {
    return <div className={`modal-body ${className}`}>{children}</div>;
}
ModalBody.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
};

export function ModalFooter({ children, className = '' }) {
    return <div className={`modal-footer ${className}`}>{children}</div>;
}
ModalFooter.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
};