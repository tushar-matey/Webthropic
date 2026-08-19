import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../lib/api.js';
import { UserMenu } from '../components/UserMenu.js';
import { Sparkles, ArrowRight, LayoutGrid, Loader2 } from 'lucide-react';

export function Home() {
  const [userPromt, setUserPromt] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userPromt.trim()) return;

    if (!isAuthenticated) {
      // Save prompt in state and navigate to login/signup
      navigate('/login', { state: { pendingPrompt: userPromt.trim() } });
      return;
    }

    try {
      setIsCreating(true);
      // Create persistent project in MongoDB
      const res = await api.post<{ success: boolean; data: any }>('/api/projects', {
        prompt: userPromt.trim(),
        name: userPromt.trim().slice(0, 35) || 'New Project'
      });

      const projectId = res.data.data._id || res.data.data.id;
      navigate(`/builder/${projectId}`, { state: { userPromt: userPromt.trim(), isNew: true } });
    } catch (error) {
      console.error('Failed to create project in database:', error);
      // Fallback navigation
      navigate('/builder', { state: { userPromt: userPromt.trim() } });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="h-20 px-8 flex items-center justify-between border-b border-white/5 bg-slate-950/40 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-105 transition">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-cyan-300 to-violet-500 bg-clip-text text-transparent">
            Webthropic
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-xl transition"
              >
                <LayoutGrid className="w-4 h-4 text-blue-400" />
                My Projects
              </Link>
              <UserMenu />
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 rounded-xl shadow-lg shadow-blue-500/20 transition hover:scale-105 active:scale-95"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main Hero Form */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl p-10 relative overflow-hidden">
          {/* Subtle accent gradients */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center mb-10 relative z-10">
            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-cyan-300 to-violet-500 bg-clip-text text-transparent">
              Webthropic
            </h1>

            <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-lg mx-auto">
              Build and deploy full-stack web applications from a single prompt with AI and WebContainers.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 relative z-10">
            <input
              type="text"
              value={userPromt}
              onChange={(e) => setUserPromt(e.target.value)}
              placeholder="Describe what you want to build... (e.g. A modern developer portfolio)"
              className="flex-1 rounded-2xl border border-slate-700 bg-slate-900/80 px-6 py-4 text-white placeholder:text-slate-500 outline-none transition-all duration-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 text-sm sm:text-base shadow-inner"
            />

            <button
              type="submit"
              disabled={isCreating}
              className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-8 py-4 font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base shrink-0"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Build
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-500">
        Webthropic AI Web Builder • Powered by Claude & WebContainer
      </footer>
    </div>
  );
}