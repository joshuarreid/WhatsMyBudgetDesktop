import {Link} from "react-router-dom";
import './Sidebar.css';
import config from '../../wmbservice-config.json';

export default function Sidebar() {
    const USER1 = config.user1;
    const USER2 = config.user2;
    return (
        <div className="sidebar">
            <h2 className="sidebar-title">WhatsMyBudget</h2>
            <div className="sidebar-divider" />
            <ul className="sidebar-list">
                <li className="sidebar-list-item">
                    <Link to="/" className="sidebar-link">Joint</Link>
                    <Link to="/user1" className="sidebar-link">{USER1}</Link>
                    <Link to="/user2" className="sidebar-link">{USER2}</Link>
                    <Link to="/settings" className="sidebar-link">Settings</Link>
                </li>
            </ul>
        </div>
    )
}