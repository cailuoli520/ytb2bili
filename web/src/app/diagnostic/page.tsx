'use client';

import { useEffect, useState } from 'react';

export default function DiagnosticPage() {
  const [apiUrl, setApiUrl] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setApiUrl(process.env.NEXT_PUBLIC_API_URL || 'Not Set');
  }, []);

  const testDirectCall = async () => {
    setError(null);
    setTestResult(null);
    try {
      const response = await fetch('http://localhost:8096/api/v1/auth/status');
      const data = await response.json();
      setTestResult({ type: 'Direct Call', data });
    } catch (err: any) {
      setError(`Direct Call Error: ${err.message}`);
    }
  };

  const testProxyCall = async () => {
    setError(null);
    setTestResult(null);
    try {
      const response = await fetch('/api/v1/auth/status');
      const data = await response.json();
      setTestResult({ type: 'Proxy Call', data });
    } catch (err: any) {
      setError(`Proxy Call Error: ${err.message}`);
    }
  };

  const testAPIClient = async () => {
    setError(null);
    setTestResult(null);
    try {
      const { authApi } = await import('@/lib/api');
      const data = await authApi.getUserStatus();
      setTestResult({ type: 'API Client', data });
    } catch (err: any) {
      setError(`API Client Error: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">API Diagnostic Tool</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
          <div className="space-y-2">
            <p className="font-mono text-sm">
              <span className="font-semibold">NEXT_PUBLIC_API_URL:</span> {apiUrl}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test API Calls</h2>
          <div className="space-y-4">
            <button
              onClick={testDirectCall}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Test Direct Call (http://localhost:8096/api/v1/auth/status)
            </button>
            <button
              onClick={testProxyCall}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Test Proxy Call (/api/v1/auth/status)
            </button>
            <button
              onClick={testAPIClient}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Test API Client (authApi.getUserStatus)
            </button>
          </div>
        </div>

        {testResult && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              Success: {testResult.type}
            </h3>
            <pre className="bg-white p-4 rounded border overflow-auto text-xs">
              {JSON.stringify(testResult.data, null, 2)}
            </pre>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-900 mb-2">Error</h3>
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>Make sure the backend server is running on port 8096</li>
            <li>Test the direct call first to verify backend connectivity</li>
            <li>If direct call works but proxy fails, restart the Next.js dev server</li>
            <li>Check browser console for CORS errors</li>
            <li>Verify .env.local has NEXT_PUBLIC_API_URL set correctly</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
