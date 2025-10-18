import PingButton from "../../components/PingButton";
import React from "react";

const JointScreen = () => {
    return (
        <div className="App">
            <header className="App-header">
                <h1>Electron + CRA Template</h1>
                <p>Use the Ping button below to verify preload -> main IPC.</p>
                <PingButton />
            </header>
        </div>
    )
};

export default JointScreen;