import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';

export function AuthCallback() {
  const navigate = useNavigate();
  const { setTokens, setUser, logout } = useAuthStore();
  const processed = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    // Support both hash (#access_token=...) and query (?error=...) params
    const hash = window.location.hash.slice(1);
    const query = window.location.search.slice(1);
    const hashParams = new URLSearchParams(hash);
    const queryParams = new URLSearchParams(query);

    // Azure can return errors as query params
    const azureError = queryParams.get('error_description') || queryParams.get('error');
    if (azureError) {
      setError(`Azure AD error: ${azureError}`);
      return;
    }

    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (!accessToken || !refreshToken) {
      setError('No tokens received. The login may have been cancelled or the redirect URI is misconfigured.');
      return;
    }

    setTokens(accessToken, refreshToken);

    authApi
      .getMe()
      .then(({ data }) => {
        setUser(data);
        navigate('/dashboard');
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.error || err?.message || 'Failed to load user profile';
        logout();
        setError(msg);
      });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white border border-red-200 rounded-xl p-8 max-w-md w-full text-center shadow-sm">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-xl">✕</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Sign-in failed</h2>
          <p className="text-sm text-red-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-6 py-2.5 rounded-lg"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Signing you in...</p>
      </div>
    </div>
  );
}
