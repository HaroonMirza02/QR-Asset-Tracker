import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { LogOut, QrCode, Menu } from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout, isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Left: Mobile Menu Toggle + Brand */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden w-10 h-10 rounded-xl bg-slate-100/80 hover:bg-slate-200/60 text-slate-700 flex items-center justify-center transition-colors shadow-xs"
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5 text-slate-800" />
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/images/eztrack-logo-ui.png" alt="" className="w-12 h-12 max-w-none" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-base tracking-tight leading-none block">
                EZTrack
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">
                Enterprise B2B
              </span>
            </div>
          </div>
        </div>

        {/* Right: Desktop User Info Badge & Mobile Logout Button */}
        {user && (
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-2.5 bg-slate-50 border border-slate-200/60 rounded-xl px-3 py-1.5 shadow-xs">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-extrabold text-xs shadow-xs">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <p className="text-xs font-extrabold text-slate-800 leading-tight">{user.name}</p>
                <p className="text-[10px] text-slate-500 font-medium">{user.email}</p>
              </div>
              <Badge variant={isAdmin ? 'indigo' : 'neutral'} className="ml-1 text-[10px] px-2 py-0.5">
                {user.role}
              </Badge>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200/80 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200/80 text-xs font-bold text-slate-600 transition-all duration-150 shadow-xs"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};



