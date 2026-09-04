import React from 'react';
import { NavLink } from 'react-router-dom';
import { Box, Users, MapPin, X, QrCode, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout, isAdmin } = useAuth();

  const navItems = [
    { label: 'Assets Directory', path: '/assets', icon: <Box className="w-5 h-5" /> },
    { label: 'Employee Directory', path: '/employees', icon: <Users className="w-5 h-5" /> },
    { label: 'Physical Locations', path: '/locations', icon: <MapPin className="w-5 h-5" /> },
  ];

  return (
    <>
      {/* Mobile Glassmorphic Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200/80 shadow-2xl lg:shadow-none flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 lg:top-16 lg:w-64 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 space-y-6">
          {/* Mobile Drawer Header with Close Button */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-slate-900 text-sm tracking-tight block leading-tight">
                  QR Asset Tracker
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Enterprise Asset Management
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">
              Main Menu
            </p>
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-extrabold'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>

        {/* Mobile User Profile Footer inside Drawer */}
        {user && (
          <div className="p-4 m-3 bg-slate-50 rounded-2xl border border-slate-200/60 lg:hidden space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                <p className="text-[10px] text-slate-500 font-medium truncate">{user.email}</p>
              </div>
              <Badge variant={isAdmin ? 'indigo' : 'neutral'} className="text-[9px] px-2 py-0.5">
                {user.role}
              </Badge>
            </div>
            <button
              onClick={() => {
                if (onClose) onClose();
                logout();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-colors border border-rose-100"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
