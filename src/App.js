import React from 'react';
import PingButton from './components/PingButton';

import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import JointScreen from "./screens/JointScreen/JointScreen";
import Sidebar from "./components/sidebar/Sidebar";
import SettingsScreen from "./screens/SettingsScreen/SettingsScreen";
import User1Screen from "./screens/User1Screen/User1Screen";
import User2Screen from "./screens/User2Screen/User2Screen";


function App() {
    return (
        <BrowserRouter>
            < Sidebar />
            <div className={"main-content"}>
                <Routes>
                    <Route path="/" element={<JointScreen />} />
                    <Route path="/user1" element={<User1Screen />} />
                    <Route path="/user2" element={<User2Screen />} />
                    <Route path="/settings" element={<SettingsScreen />} />
                </Routes>
            </div>
        </BrowserRouter>

    );
}

export default App;