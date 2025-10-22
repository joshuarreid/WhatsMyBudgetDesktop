import { useCallback, useEffect, useState } from "react";
import config from "../../wmbservice-config.json";

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
export default function useSidebar() {
    const { user1 = "User 1", user2 = "User 2" } = config || {};

    const [viewsOpen, setViewsOpen] = useState(() => {
        try {
            return localStorage.getItem("sidebar.viewsOpen") === "1";
        } catch (err) {
            console.debug("[useSidebar] localStorage read failed, defaulting viewsOpen=true", err);
            return true;
        }
    });

    useEffect(() => {
        console.debug("[useSidebar] mounted", { user1, user2, viewsOpen });
        return () => console.debug("[useSidebar] unmounted");
        // We intentionally do not add setViewsOpen to deps.
    }, [user1, user2, viewsOpen]);

    const toggleViews = useCallback(() => {
        setViewsOpen((prev) => {
            const next = !prev;
            try {
                localStorage.setItem("sidebar.viewsOpen", next ? "1" : "0");
            } catch (err) {
                console.debug("[useSidebar] failed to persist sidebar.viewsOpen", err);
            }
            console.debug("[useSidebar] toggleViews", { prev, next });
            return next;
        });
    }, []);

    const handleNavClick = useCallback((to) => {
        // Centralized navigation logging so we can enhance/telemetry later
        console.info("[useSidebar] navigate", { to });
    }, []);

    const views = [
        { to: "/joint", label: "Joint" },
        { to: "/user1", label: user1 },
        { to: "/user2", label: user2 },
    ];

    return {
        viewsOpen,
        toggleViews,
        handleNavClick,
        views,
    };
}