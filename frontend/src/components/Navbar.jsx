import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Mic, LogOut, Building, FileText } from 'lucide-react';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  const isCompanies = location.pathname === '/companies';
  const isReports = location.pathname.includes('/report');

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link to={isAuthenticated ? '/companies' : '/resume'} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
            <Mic className="w-4 h-4" />
          </div>
          <span className="font-bold text-base text-gray-900">
            MockInterview<span className="text-indigo-600">.ai</span>
          </span>
        </Link>

        {/* Right Nav */}
        {isAuthenticated && user && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Link
                to="/companies"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isCompanies && !isReports
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Building className="w-4 h-4" />
                <span>Companies</span>
              </Link>
            </div>

            <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-semibold text-gray-900 leading-tight">
                  {user.name || 'Candidate'}
                </p>
                <p className="text-[11px] text-gray-500 leading-tight">
                  {user.email}
                </p>
              </div>

              <button
                onClick={logout}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 px-2 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
