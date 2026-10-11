import { useState, useEffect } from 'react';
import api from '../api/axios';

/**
 * LandingPage — The public home page of UNFAZED
 * 
 * This is what visitors see when they first arrive at the site.
 * It explains what UNFAZED does and provides registration/login links.
 * Also fetches the backend health check to verify connectivity.
 */
export default function LandingPage() {
  const [backendStatus, setBackendStatus] = useState('checking');

  useEffect(() => {
    // Check if the backend is reachable
    api.get('/api/health')
      .then((res) => {
        if (res.data.status === 'ok') {
          setBackendStatus('connected');
        }
      })
      .catch(() => {
        setBackendStatus('disconnected');
      });
  }, []);

  return (
    <div className="min-h-screen bg-surface-50">
      {/* ─── Navigation ──────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-surface-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                <span className="text-white font-bold text-sm">U</span>
              </div>
              <span className="text-xl font-bold text-surface-900 tracking-tight">
                UNFAZED
              </span>
            </div>

            {/* Nav Links — will become real links in Module 1 */}
            <div className="flex items-center gap-3">
              <a
                href="/login"
                className="px-4 py-2 text-sm font-medium text-surface-600 hover:text-surface-900 transition-colors"
              >
                Log in
              </a>
              <a
                href="/register"
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ────────────────────────────────── */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm font-medium mb-6 border border-primary-100">
            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
            Built for therapists in India
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-surface-900 tracking-tight leading-tight">
            Your practice,{' '}
            <span className="bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
              beautifully managed
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-lg sm:text-xl text-surface-500 max-w-2xl mx-auto leading-relaxed">
            UNFAZED gives you a branded website to manage clients, appointments,
            payments, clinical notes, and communication — all in one place.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/register"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-all shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:-translate-y-0.5"
            >
              Start Free Trial
            </a>
            <a
              href="#features"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-surface-700 bg-white hover:bg-surface-50 rounded-xl transition-all border border-surface-200 shadow-sm"
            >
              See Features
            </a>
          </div>
        </div>
      </section>

      {/* ─── Features Grid ───────────────────────────────── */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-surface-900 tracking-tight">
              Everything you need to run your practice
            </h2>
            <p className="mt-4 text-lg text-surface-500 max-w-2xl mx-auto">
              From your first client to a full caseload, UNFAZED scales with you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Backend Status (Dev) ────────────────────────── */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-surface-50">
        <div className="max-w-md mx-auto text-center">
          <h3 className="text-sm font-semibold text-surface-400 uppercase tracking-wider mb-3">
            System Status
          </h3>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-surface-200 shadow-sm">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                backendStatus === 'connected'
                  ? 'bg-emerald-500'
                  : backendStatus === 'checking'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-red-400'
              }`}
            />
            <span className="text-sm font-medium text-surface-600">
              {backendStatus === 'connected'
                ? 'Backend connected'
                : backendStatus === 'checking'
                  ? 'Checking backend...'
                  : 'Backend not reachable'}
            </span>
          </div>
          {backendStatus === 'disconnected' && (
            <p className="mt-3 text-xs text-surface-400">
              Start the backend with <code className="px-1.5 py-0.5 bg-surface-100 rounded text-surface-600">npm run dev</code> in the unfazed-backend folder
            </p>
          )}
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────── */}
      <footer className="py-8 px-4 border-t border-surface-200 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <span className="text-white font-bold text-xs">U</span>
            </div>
            <span className="text-sm font-semibold text-surface-700">UNFAZED</span>
          </div>
          <p className="text-sm text-surface-400">
            © {new Date().getFullYear()} UNFAZED. Built as an educational project.
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ─── Feature Data ──────────────────────────────────────────────── */
const features = [
  {
    icon: '🧑‍⚕️',
    title: 'Branded Profile',
    description: 'Get a unique public URL — like /dr-sharma — where clients can learn about you and book appointments.',
  },
  {
    icon: '📅',
    title: 'Smart Scheduling',
    description: 'Set your availability, manage time zones, and let clients book sessions without back-and-forth messaging.',
  },
  {
    icon: '👥',
    title: 'Client Management',
    description: 'Keep track of client records, intake forms, consent, session history, and status tags.',
  },
  {
    icon: '💳',
    title: 'Payments & Packages',
    description: 'Accept payments via Razorpay, sell session packages, and generate professional PDF invoices.',
  },
  {
    icon: '📝',
    title: 'Clinical Notes',
    description: 'Write private or shared session notes with a rich-text editor. SOAP and DAP templates included.',
  },
  {
    icon: '📊',
    title: 'Analytics',
    description: 'Track revenue, client growth, and appointment trends with real-time charts and insights.',
  },
];

/* ─── Feature Card Component ────────────────────────────────────── */
function FeatureCard({ icon, title, description }) {
  return (
    <div className="group p-6 bg-surface-50 rounded-2xl border border-surface-100 hover:border-primary-200 hover:shadow-lg hover:shadow-primary-500/5 transition-all duration-300">
      <div className="w-12 h-12 rounded-xl bg-white border border-surface-200 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-surface-900 mb-2">{title}</h3>
      <p className="text-sm text-surface-500 leading-relaxed">{description}</p>
    </div>
  );
}
