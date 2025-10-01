import { useEffect, useState } from 'react';

export function TestConnection() {
  const [status, setStatus] = useState('Testing...');
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    // Test connection type and live backend
    const checkConnection = async () => {
      if (typeof window !== 'undefined' && window.electronAPI) {
        setStatus('Running in Electron desktop mode');
        setIsLive(false);
      } else {
        // Test if live backend is available
        try {
          const response = await fetch('http://localhost:3001/api/connection-state');
          if (response.ok) {
            const data = await response.json();
            setStatus(`🔥 LIVE MODE: ${data.message}`);
            setIsLive(true);
          } else {
            throw new Error('Backend not available');
          }
        } catch (error) {
          setStatus('Running in Browser mode (demo data)');
          setIsLive(false);
        }
      }
    };

    checkConnection();
  }, []);

  return (
    <div className={`p-4 border rounded-lg ${isLive ? 'bg-blue-100 border-blue-200' : 'bg-green-100 border-green-200'}`}>
      <h3 className={`font-bold ${isLive ? 'text-blue-800' : 'text-green-800'}`}>Connection Status</h3>
      <p className={`${isLive ? 'text-blue-700' : 'text-green-700'}`}>{status}</p>
      <p className={`text-sm mt-2 ${isLive ? 'text-blue-600' : 'text-green-600'}`}>
        {isLive ? '🚀 Live backend connected - real-time updates active!' : 'React app is working correctly!'}
      </p>
    </div>
  );
}