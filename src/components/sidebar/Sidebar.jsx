import React, { memo, useEffect, useCallback, useState } from "react";
import { NavLink } from "react-router-dom";
import "../../App.css";
import config from "../../wmbservice-config.json";

/**
 * Sidebar with an accessible accordion for the "Views" section.
 *
 * - Persists open/closed state to localStorage
 * - Accessible: uses <button aria-expanded> and aria-controls
 * - Minimal DOM & CSS changes — visual animation is driven by CSS (max-height)
 * - Robust logging via console.debug for lifecycle and user interactions
 *
 * Improvements you can make:
 * - Measure scrollHeight and set inline max-height for pixel-perfect animation
 * - Use a context or a store (zustand) if multiple components need the collapsed state
 * - Add icons (react-icons) and unit tests
 */

function Sidebar() {
    const { user1 = "User 1", user2 = "User 2" } = config || {};

    // Try to restore persisted accordion state (safe read)
    const [viewsOpen, setViewsOpen] = useState(() => {
        try {
            return localStorage.getItem("sidebar.viewsOpen") === "1";
        } catch (err) {
            console.debug("[Sidebar] failed to read sidebar.viewsOpen from localStorage", err);
            return true; // default open
        }
    });

    useEffect(() => {
        console.debug("[Sidebar] mounted", { user1, user2, viewsOpen });
        return () => console.debug("[Sidebar] unmounted");
    }, [user1, user2, viewsOpen]);

    const handleNavClick = useCallback((to) => {
        console.info("[Sidebar] navigate", { to });
    }, []);

    const toggleViews = useCallback(() => {
        setViewsOpen((prev) => {
            const next = !prev;
            try {
                localStorage.setItem("sidebar.viewsOpen", next ? "1" : "0");
            } catch (err) {
                console.debug("[Sidebar] failed to persist sidebar.viewsOpen", err);
            }
            console.debug("[Sidebar] toggle Views", { prev, next });
            return next;
        });
    }, []);

    const views = [
        { to: "/joint", label: "Joint" },
        { to: "/user1", label: user1 },
        { to: "/user2", label: user2 },
    ];

    return (
        <nav className="sidebar" aria-label="Primary navigation">
            <div className="sidebar-brand" aria-hidden>
                <h2 className="sidebar-title">WhatsMyBudget</h2>
            </div>

            <div className="sidebar-section" aria-label="Primary links">
                <ul className="sidebar-list" role="menu">
                    <li className="sidebar-list-item" role="none">
                        <NavLink
                            to="/"
                            className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")}
                            onClick={() => handleNavClick("/")}
                            role="menuitem"
                            aria-current={window.location.pathname === "/" ? "page" : undefined}
                        >
                            All Transactions
                        </NavLink>
                    </li>
                </ul>
            </div>

            <div className="sidebar-divider" />

            {/* Views accordion */}
            <div className="sidebar-section" aria-label="Views">
                <button
                    type="button"
                    className="sidebar-accordion-toggle"
                    aria-expanded={viewsOpen}
                    aria-controls="views-region"
                    onClick={toggleViews}
                >
                    <span className="sidebar-heading">Views</span>
                    <span className={`chevron ${viewsOpen ? "open" : ""}`} aria-hidden>
            ▶
          </span>
                </button>

                <div
                    id="views-region"
                    className={`views-panel ${viewsOpen ? "open" : "collapsed"}`}
                    // aria-hidden is optional because aria-expanded on the controller is already present,
                    // but useful for screen readers if you prefer.
                    aria-hidden={!viewsOpen}
                >
                    <ul className="views-list" role="menu">
                        {views.map((v) => (
                            <li key={v.to} className="sidebar-list-item" role="none">
                                <NavLink
                                    to={v.to}
                                    className={({ isActive }) =>
                                        isActive ? "sidebar-link view-link active" : "sidebar-link view-link"
                                    }
                                    onClick={() => handleNavClick(v.to)}
                                    role="menuitem"
                                >
                                    {v.label}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="sidebar-divider" />

            <div className="sidebar-section" aria-label="Settings">
                <ul className="sidebar-list" role="menu">
                    <li className="sidebar-list-item" role="none">
                        <NavLink
                            to="/settings"
                            className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")}
                            onClick={() => handleNavClick("/settings")}
                            role="menuitem"
                        >
                            Settings
                        </NavLink>
                    </li>
                </ul>
            </div>
        </nav>
    );
}

export default memo(Sidebar);