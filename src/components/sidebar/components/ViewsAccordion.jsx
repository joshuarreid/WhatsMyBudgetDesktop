import React, { memo } from "react";
import SidebarLink from "./SidebarLink";
import useViewsAccordion from "../hooks/useViewsAccordion";

/**
 * ViewsAccordion - presentation + ARIA
 *
 * - Delegates measurement/resize concerns to useViewsAccordion
 * - Keeps markup, aria attributes and animation CSS in one place
 */
function ViewsAccordion({ id = "views-region", views = [], viewsOpen, toggleViews, handleNavClick }) {
    // Pass the views as a dep so we recompute if the list changes
    const { panelRef, maxHeight } = useViewsAccordion(!!viewsOpen, [views]);

    return (
        <>
            <button
                type="button"
                className="sidebar-accordion-toggle"
                aria-expanded={!!viewsOpen}
                aria-controls={id}
                onClick={toggleViews}
            >
                <span className="sidebar-heading">Views</span>
                <span className={`chevron ${viewsOpen ? "open" : ""}`} aria-hidden>
          ▶
        </span>
            </button>

            <div
                id={id}
                ref={panelRef}
                className={`views-panel ${viewsOpen ? "open" : "collapsed"}`}
                aria-hidden={!viewsOpen}
                style={{ maxHeight, overflow: "hidden", transition: "max-height 280ms ease" }}
            >
                <ul className="views-list" role="menu">
                    {views.map((v) => (
                        <li key={v.to} className="sidebar-list-item" role="none">
                            <SidebarLink to={v.to} label={v.label} onClick={handleNavClick} extraClass="view-link" />
                        </li>
                    ))}
                </ul>
            </div>
        </>
    );
}

export default memo(ViewsAccordion);