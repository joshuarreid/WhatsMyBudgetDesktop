import React from 'react';
import PingButton from './components/PingButton';

import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import JointScreen from "./screens/JointScreen/JointScreen";
import Sidebar from "./components/sidebar/Sidebar";
import SettingsScreen from "./screens/SettingsScreen/SettingsScreen";


function App() {
    return (
        <BrowserRouter>
            < Sidebar />
            <div className={"main-content"}>
                <Routes>
                    <Route path="/" element={<JointScreen />} />
                    <Route path="/settings" element={<SettingsScreen />} />
                </Routes>
            </div>
        </BrowserRouter>

    );
}

export default App;