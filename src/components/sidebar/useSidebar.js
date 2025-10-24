import { useCallback, useEffect, useState, useMemo } from "react";
import { get } from "../../config/config.ts";

/**
 * useSidebar - encapsulates sidebar state + interactions
 *
 * Responsibilities:
 * - Read/write persisted "views" open state (safe localStorage access)
 * - Expose toggle + navigation logging callback
 * - Provide configured views (reads labels from config)
 *
 * Follows "Bulletproof React" conventions:
 * - Keep logic co-located and testable (hook)
 * - Use lazy state initializer for performance
 * - Robust logging for lifecycle & user interactions
 */

const logger = {
    info: (...args) => console.log('[useSidebar]', ...args),
    error: (...args) => console.error('[useSidebar]', ...args),
};

const SIDEBAR_VIEWS_KEY = "sidebar.viewsOpen";

export default function useSidebar() {
    // Prefer explicit config access via helpers for predictable defaults and logging.
    const user1Label = get("user1.name", "User 1");
    const user2Label = get("user2.name", "User 2");
    const jointLabel = get("joint.name", "Joint");

    const [viewsOpen, setViewsOpen] = useState(() => {
        try {
            return localStorage.getItem(SIDEBAR_VIEWS_KEY) === "1";
        } catch (err) {
            logger.info("localStorage read failed, defaulting viewsOpen=true", { err });
            return true;
        }
    });

    useEffect(() => {
        logger.info("mounted", { user1: user1Label, user2: user2Label, viewsOpen });
        return () => logger.info("unmounted");
        // intentionally no setViewsOpen in deps to avoid re-registering cleanup
    }, [user1Label, user2Label, viewsOpen]);

    const toggleViews = useCallback(() => {
        setViewsOpen((prev) => {
            const next = !prev;
            try {
                localStorage.setItem(SIDEBAR_VIEWS_KEY, next ? "1" : "0");
            } catch (err) {
                logger.info("failed to persist sidebar.viewsOpen", { err });
            }
            logger.info("toggleViews", { prev, next });
            return next;
        });
    }, []);

    const handleNavClick = useCallback((to) => {
        // Centralized navigation logging so we can enhance/telemetry later
        logger.info("navigate", { to });
    }, []);

    // Memoize views so the array identity is stable between renders
    const views = useMemo(
        () => [
            { to: "/joint", label: jointLabel },
            { to: "/user1", label: user1Label },
            { to: "/user2", label: user2Label },
        ],
        [jointLabel, user1Label, user2Label]
    );

    return {
        viewsOpen,
        toggleViews,
        handleNavClick,
        views,
    };
}