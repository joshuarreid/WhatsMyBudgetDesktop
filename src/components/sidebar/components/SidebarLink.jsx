import React, { memo } from "react";
import { NavLink } from "react-router-dom";

/**
 * SidebarLink - tiny presentational wrapper around NavLink
 * - Keeps className logic consistent in one place
 * - Adds robust logging (caller supplies handleNavClick)
 *
 * Props:
 * - to: string
 * - label: node
 * - onClick: function (optional)
 * - extraClass: string (optional) - additional classes to apply
 */
function SidebarLink({ to, label, onClick, extraClass = "" }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${extraClass} ${isActive ? "sidebar-link active" : "sidebar-link"}`.trim()
      }
      onClick={() => {
        try {
          onClick?.(to);
        } catch (err) {
          // Defensive logging in case the handler throws
          console.debug("[SidebarLink] onClick handler threw", { to }, err);
        }
      }}
      role="menuitem"
    >
      {label}
    </NavLink>
  );
}

export default memo(SidebarLink);