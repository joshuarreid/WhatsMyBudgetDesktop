import React, { memo } from "react";
import "../../App.css";
import useSidebar from "./hooks/useSidebar";
import ViewsAccordion from "./components/ViewsAccordion";
import SidebarLink from "./components/SidebarLink";

/**
 * Sidebar - composed from small, testable parts
 *
 * - Uses useSidebar hook to keep state & logic separated from rendering
 * - Views accordion extracted to ViewsAccordion (measured animation)
 * - SidebarLink standardized NavLink wrapper
 *
 * Notes:
 * - Keeps existing ARIA semantics
 * - Robust logging delegated to hook/components
 */
function Sidebar() {
    const { viewsOpen, toggleViews, handleNavClick, views } = useSidebar();

    return (
        <nav className="sidebar" aria-label="Primary navigation">
            <div className="sidebar-brand" aria-hidden>
                <h2 className="sidebar-title">WhatsMyBudget</h2>
            </div>

            <div className="sidebar-section" aria-label="Primary links">
                <ul className="sidebar-list" role="menu">
                    <li className="sidebar-list-item" role="none">
                        <SidebarLink to="/" label="All Transactions" onClick={handleNavClick} />
                    </li>
                    <li className="sidebar-list-item" role="none">
                        <SidebarLink to="/payments" label="Payments" onClick={handleNavClick} />
                    </li>
                </ul>
            </div>

            <div className="sidebar-divider" />

            <div className="sidebar-section" aria-label="Views">
                <ViewsAccordion id="views-region" views={views} viewsOpen={viewsOpen} toggleViews={toggleViews} handleNavClick={handleNavClick} />
            </div>

            <div className="sidebar-divider" />

            <div className="sidebar-section" aria-label="Settings">
                <ul className="sidebar-list" role="menu">
                    <li className="sidebar-list-item" role="none">
                        <SidebarLink to="/settings" label="Settings" onClick={handleNavClick} />
                    </li>
                </ul>
            </div>
        </nav>
    );
}

export default memo(Sidebar);