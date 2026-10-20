import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Sparkles, LogOut, User, Building2 } from 'lucide-react';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-dark-border bg-dark-bg/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <Link to={isAuthenticated ? '/companies' : '/resume'} className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-500 to-accent-cyan p-0.5 shadow-lg shadow-brand-500/20 group-hover:shadow-brand-500/40 transition-shadow">
            <div className="w-full h-full bg-dark-bg rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-brand-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              AI Interview Simulator
              <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">
                Voice AI
              </span>
            </span>
          </div>
        </Link>

        {/* Right side Auth details */}
        {isAuthenticated && user && (
          <div className="flex items-center gap-3">
            <Link
              to="/companies"
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-dark-muted hover:text-white px-3 py-1.5 rounded-lg border border-dark-border/60 hover:border-dark-border hover:bg-dark-elevated transition-colors"
            >
              <Building2 className="w-3.5 h-3.5" />
              Companies
            </Link>

            <div className="flex items-center gap-2.5 pl-2 border-l border-dark-border">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-indigo to-brand-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                {user.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-semibold text-white leading-tight">
                  {user.name || 'Candidate'}
                </span>
                <span className="text-[11px] text-dark-muted leading-tight truncate max-w-[140px]">
                  {user.email}
                </span>
              </div>

              <button
                onClick={logout}
                title="Log out"
                className="p-1.5 rounded-lg text-dark-muted hover:text-accent-rose hover:bg-accent-rose/10 transition-colors ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
