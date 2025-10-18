import React, { useState } from 'react';

export default function PingButton() {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    async function doPing() {
        setLoading(true);
        setResult(null);
        try {
            // Access the safe preload API
            // eslint-disable-next-line no-undef
            const res = await window.electronAPI.ping({ hello: 'world', ts: Date.now() });
            setResult(JSON.stringify(res, null, 2));
        } catch (err) {
            setResult('Error: ' + (err && err.message ? err.message : String(err)));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <button onClick={doPing} disabled={loading}>
                {loading ? 'Pinging...' : 'Ping Main'}
            </button>
            {result && (
                <pre style={{ textAlign: 'left', background: '#111', color: '#ddd', padding: 12, marginTop: 16, maxWidth: 800, overflowX: 'auto' }}>
          {result}
        </pre>
            )}
        </div>
    );
}