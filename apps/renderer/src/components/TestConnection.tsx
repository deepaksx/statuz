import { useEffect, useState } from 'react';

export function TestConnection() {
  const [status, setStatus] = useState('Testing...');

  useEffect(() => {
    // Test if we're in browser or Electron
    if (typeof window !== 'undefined' && window.electronAPI) {
      setStatus('Running in Electron mode');
    } else {
      setStatus('Running in Browser mode (using mock data)');
    }
  }, []);

  return (
    <div className="p-4 bg-green-100 border border-green-200 rounded-lg">
      <h3 className="font-bold text-green-800">Connection Status</h3>
      <p className="text-green-700">{status}</p>
      <p className="text-sm text-green-600 mt-2">
        If you see this message, the React app is working correctly!
      </p>
    </div>
  );
}