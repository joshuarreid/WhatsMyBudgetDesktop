import { useEffect } from 'react';

const logger = {
    info: (...args) => console.log('[useLockBodyScroll]', ...args),
    error: (...args) => console.error('[useLockBodyScroll]', ...args),
};

/**
 * Reference-counted body scroll lock.
 * Multiple consumers can call this hook; body overflow is restored when the last consumer unmounts.
 */
let lockCount = 0;
let originalOverflow = '';

export default function useLockBodyScroll(active) {
    useEffect(() => {
        if (!active) return undefined;

        try {
            if (typeof document === 'undefined') return undefined;
            if (lockCount === 0) {
                originalOverflow = document.body.style.overflow || '';
                document.body.style.overflow = 'hidden';
                logger.info('locked body scroll');
            }
            lockCount += 1;

            return () => {
                lockCount -= 1;
                if (lockCount <= 0) {
                    document.body.style.overflow = originalOverflow || '';
                    logger.info('restored body scroll');
                    lockCount = 0;
                }
            };
        } catch (err) {
            logger.error('useLockBodyScroll error', err);
            return undefined;
        }
    }, [active]);
}