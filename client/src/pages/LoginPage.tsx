import { useState } from 'react';
import { Mail, Shield, Users, Zap, CheckCircle, BarChart3 } from 'lucide-react';
import { authApi } from '../services/api';

// Inline signature card mock-ups shown on the left panel
function SignatureCard({ name, title, company, color, email, phone }: {
  name: string; title: string; company: string; color: string; email: string; phone: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-4 border border-white/10" style={{ minWidth: '280px' }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: color }}>
          {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm leading-tight">{name}</p>
          <p className="text-xs font-medium leading-tight" style={{ color }}>{title}</p>
        </div>
      </div>
      <div style={{ borderLeft: `3px solid ${color}`, paddingLeft: '10px' }}>
        <p className="text-xs text-gray-500 leading-relaxed">{company}</p>
        <p className="text-xs text-gray-500">{email}</p>
        <p className="text-xs text-gray-500">{phone}</p>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: Zap, text: 'Auto-deploy signatures via Microsoft 365' },
  { icon: Users, text: 'Centralised control for all employees' },
  { icon: BarChart3, text: 'Track campaign banner performance' },
  { icon: Shield, text: 'Azure AD sync · ISO 27001 certified' },
];

const SAMPLE_CARDS = [
  { name: 'Sarah Johnson', title: 'Chief Executive Officer', company: 'Acme Corporation · New York, NY', email: 'sjohnson@acmecorp.com', phone: '+1 (212) 555-0101', color: '#0078d4' },
  { name: 'Marcus Chen', title: 'Head of Engineering', company: 'TechVentures Ltd · San Francisco, CA', email: 'm.chen@techventures.io', phone: '+1 (415) 555-0188', color: '#009639' },
  { name: 'Priya Patel', title: 'Senior Legal Counsel', company: 'Global Partners LLP · London, UK', email: 'p.patel@globalpartners.co.uk', phone: '+44 20 7946 0958', color: '#7c3aed' },
];

export function LoginPage() {
  const [msLoading, setMsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleMicrosoftLogin = async () => {
    setMsLoading(true);
    setError('');
    try {
      const { data } = await authApi.getLoginUrl();
      window.location.href = data.loginUrl;
    } catch {
      setError('Microsoft login unavailable. Please try again.');
      setMsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden">

      {/* ── Left panel — dark navy with signature showcase ── */}
      <div className="hidden lg:flex lg:w-[58%] flex-col bg-[#0f1f35] relative overflow-hidden">

        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Gradient orbs */}
        <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-blue-600 rounded-full opacity-10 blur-[100px]" />
        <div className="absolute bottom-[-80px] right-[-80px] w-[300px] h-[300px] bg-indigo-500 rounded-full opacity-10 blur-[80px]" />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full px-12 py-10">

          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-base leading-tight">SignatureHub</p>
              <p className="text-blue-300 text-[11px] leading-tight">Enterprise Edition</p>
            </div>
          </div>

          {/* Headline */}
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-white leading-tight mb-3">
              Professional email signatures,<br />
              <span className="text-blue-400">deployed at scale.</span>
            </h2>
            <p className="text-blue-200/70 text-sm leading-relaxed max-w-sm">
              Centrally manage, brand, and auto-deploy email signatures across your entire Microsoft 365 organisation — no client installs required.
            </p>
          </div>

          {/* Feature list */}
          <div className="grid grid-cols-1 gap-2.5 mb-10">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/20 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <span className="text-sm text-blue-100/80">{text}</span>
              </div>
            ))}
          </div>

          {/* Signature card previews */}
          <div className="flex-1 flex flex-col justify-end">
            <p className="text-xs text-blue-300/50 uppercase tracking-widest mb-4 font-semibold">Live signature previews</p>
            <div className="space-y-3">
              {SAMPLE_CARDS.map((card, i) => (
                <div
                  key={card.name}
                  className="transition-transform"
                  style={{
                    transform: `translateX(${i * 6}px)`,
                    opacity: 1 - i * 0.1,
                  }}
                >
                  <SignatureCard {...card} />
                </div>
              ))}
            </div>
          </div>

          {/* Bottom badges */}
          <div className="mt-8 flex items-center gap-5 flex-wrap">
            {/* Microsoft 365 */}
            <div className="flex items-center gap-2 opacity-60">
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <rect x="1" y="1" width="10" height="10" fill="#f35325" rx="0.5" />
                <rect x="13" y="1" width="10" height="10" fill="#81bc06" rx="0.5" />
                <rect x="1" y="13" width="10" height="10" fill="#05a6f0" rx="0.5" />
                <rect x="13" y="13" width="10" height="10" fill="#ffba08" rx="0.5" />
              </svg>
              <span className="text-[11px] text-blue-200">Microsoft 365 Certified</span>
            </div>

            {/* ISO */}
            <div className="flex items-center gap-1.5 opacity-60">
              <div className="w-5 h-5 rounded-full border border-blue-300/40 flex items-center justify-center">
                <span className="text-[7px] text-blue-300 font-bold">ISO</span>
              </div>
              <span className="text-[11px] text-blue-200">27001 · 27018</span>
            </div>

            {/* GDPR */}
            <div className="flex items-center gap-1.5 opacity-60">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-[11px] text-blue-200">GDPR Compliant</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel — login form ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-8 py-10">

        {/* Mobile logo (only on small screens) */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900">SignatureHub</p>
            <p className="text-xs text-gray-400">Enterprise Edition</p>
          </div>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
            <p className="text-sm text-gray-500">Sign in to manage your organisation's email signatures.</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Microsoft SSO */}
          <button
            onClick={handleMicrosoftLogin}
            disabled={msLoading}
            className="w-full flex items-center justify-center gap-3 border border-gray-200 hover:bg-gray-50 disabled:opacity-60 text-gray-700 font-medium py-3 px-6 rounded-xl transition-colors text-sm"
          >
            {msLoading ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 23 23" fill="none">
                  <path d="M1 1h9.5v9.5H1z" fill="#f35325" />
                  <path d="M12.5 1H22v9.5h-9.5z" fill="#81bc06" />
                  <path d="M1 11.5h9.5V21H1z" fill="#05a6f0" />
                  <path d="M12.5 11.5H22V21h-9.5z" fill="#ffba08" />
                </svg>
                Sign in with Microsoft 365
              </>
            )}
          </button>

          {/* Footer */}
          <div className="mt-8 space-y-1 text-center">
            <p className="text-xs text-gray-300">© 2026 SignatureHub · All rights reserved</p>
          </div>
        </div>
      </div>
    </div>
  );
}
