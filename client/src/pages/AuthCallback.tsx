import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';

export function AuthCallback() {
  const navigate = useNavigate();
  const { setTokens, setUser, logout } = useAuthStore();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken || !refreshToken) {
      logout();
      navigate('/login');
      return;
    }

    setTokens(accessToken, refreshToken);

    // Fetch user profile
    authApi
      .getMe()
      .then(({ data }) => {
        setUser(data);
        navigate('/dashboard');
      })
      .catch(() => {
        logout();
        navigate('/login');
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Signing you in...</p>
      </div>
    </div>
  );
}
