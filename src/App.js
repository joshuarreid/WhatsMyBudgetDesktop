import React from 'react';
import PingButton from './components/PingButton';
import './App.css';

function App() {
    return (
        <div className="App">
            <header className="App-header">
                <h1>Electron + CRA Template</h1>
                <p>Use the Ping button below to verify preload -> main IPC.</p>
                <PingButton />
            </header>
        </div>
    );
}

export default App;