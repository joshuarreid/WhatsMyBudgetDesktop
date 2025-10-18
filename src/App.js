import React from 'react';
import PingButton from './components/PingButton';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import JointScreen from "./screens/JointScreen/JointScreen";


function App() {
    return (
        <BrowserRouter>
            <div className={"main-content"}>
                <Routes>
                    <Route path="/" element={<JointScreen />} />
                </Routes>
            </div>
        </BrowserRouter>

    );
}

export default App;