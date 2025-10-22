import { useEffect, useRef } from 'react';

const logger = {
    info: (...args) => console.log('[useFocusTrap]', ...args),
    error: (...args) => console.error('[useFocusTrap]', ...args),
};

const FOCUSABLE_SELECTORS = [
    'a[href]',
    'area[href]',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'button:not([disabled])',
    'iframe',
    'object',
    'embed',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable]',
].join(',');

/**
 * Minimal focus trap:
 * - When active becomes true: save previously focused element and focus root.
 * - Trap Tab / Shift+Tab behavior inside the root element.
 * - Restore focus on cleanup.
 *
 * Note: For very complex focus scenarios consider using focus-trap-react or Reach UI Dialog.
 */
export default function useFocusTrap(dialogRef, active) {
    const previouslyFocused = useRef(null);

    useEffect(() => {
        if (!active) return undefined;

        try {
            if (typeof document === 'undefined') return undefined;
            previouslyFocused.current = document.activeElement;
            const root = dialogRef.current;
            if (!root) return undefined;

            // make sure dialog root is focusable
            if (typeof root.focus === 'function') {
                try {
                    root.focus();
                } catch (err) {
                    // defensive
                }
            }

            function getFocusable() {
                return Array.from(root.querySelectorAll(FOCUSABLE_SELECTORS)).filter(
                    (el) =>
                        // visible
                        (el.offsetWidth > 0 ||
                            el.offsetHeight > 0 ||
                            el.getClientRects().length > 0) &&
                        // not inert
                        !el.hasAttribute('disabled'),
                );
            }

            function onKey(e) {
                if (e.key !== 'Tab') return;
                const focusable = getFocusable();
                if (focusable.length === 0) {
                    // nothing focusable - keep focus on root
                    e.preventDefault();
                    root.focus();
                    return;
                }

                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                const current = document.activeElement;

                if (!e.shiftKey && (current === last || current === root)) {
                    // tab forward from last -> first
                    e.preventDefault();
                    first.focus();
                } else if (e.shiftKey && (current === first || current === root)) {
                    // tab backward from first -> last
                    e.preventDefault();
                    last.focus();
                }
            }

            window.addEventListener('keydown', onKey);
            logger.info('focus trap enabled');

            return () => {
                window.removeEventListener('keydown', onKey);
                try {
                    previouslyFocused.current?.focus?.();
                } catch (err) {
                    logger.error('error restoring focus', err);
                }
                logger.info('focus trap disabled, focus restored');
            };
        } catch (err) {
            logger.error('useFocusTrap error', err);
            return undefined;
        }
    }, [dialogRef, active]);
}