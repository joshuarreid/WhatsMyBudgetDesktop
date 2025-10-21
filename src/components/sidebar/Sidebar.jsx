import {Link} from "react-router-dom";
import './Sidebar.css'

export default function Sidebar() {
    return (
        <div className="sidebar">
            <h2 className="sidebar-title">WhatsMyBudget</h2>
            <div classname="sidebar-divider" />
            <ul className="sidebar-list">
                <li classname="sidebar-list-item">
                    <Link to="/" className="sidebar-link">Joint</Link>
                    <Link to="/settings" className="sidebar-link">Settings</Link>
                </li>
            </ul>
        </div>
    )
}