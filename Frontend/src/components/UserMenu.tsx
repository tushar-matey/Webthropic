import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { LogOut, LayoutGrid, PlusCircle, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';

export const UserMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 transition-all duration-200 text-slate-200"
      >
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-lg object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-violet-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
            {initials}
          </div>
        )}
        <span className="text-xs font-medium max-w-[120px] truncate hidden sm:inline">{user.name}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">


          {/* Menu items */}
          <div className="space-y-1">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/dashboard');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 rounded-xl transition"
            >
              <LayoutGrid className="w-4 h-4 text-blue-400" />
              My Projects
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 rounded-xl transition"
            >
              <PlusCircle className="w-4 h-4 text-violet-400" />
              New Website
            </button>

            <div className="h-px bg-slate-800/80 my-1" />

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-xl transition"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
