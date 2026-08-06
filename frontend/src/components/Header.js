'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Avatar from './ui/Avatar';
import { Search } from 'lucide-react';

function Header({ placeholder = "Search...", value, onChange, leftSection, centerSection, isDark = false, children }) {
  const { user, profile } = useAuth();

  return (
    <div className={`px-8 py-4 flex justify-between items-center gap-4 flex-shrink-0 text-left transition-colors ${
      isDark 
        ? 'bg-[#0d1712]/90 border-b border-emerald-950/80 backdrop-blur-md text-slate-100'
        : 'bg-white border-b border-border-custom text-slate-900'
    }`}>
      {/* Left side: either leftSection or Search bar */}
      <div className="flex items-center gap-4">
        {leftSection ? (
          leftSection
        ) : (
          <div className="relative w-80">
            <span className={`absolute inset-y-0 left-3 flex items-center pointer-events-none ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder={placeholder}
              value={value}
              onChange={onChange}
              className={`w-full pl-9 pr-4 py-1.5 rounded-full text-sm transition-all text-left ${
                isDark
                  ? 'bg-slate-900/90 border border-slate-800 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500/60'
                  : 'bg-[#f1f5f9] border border-transparent text-text-primary placeholder-gray-400 focus:outline-none focus:bg-white focus:border-gray-300'
              }`}
            />
          </div>
        )}
      </div>

      {/* Center section */}
      {centerSection && (
        <div className="flex-1 flex justify-center max-w-md mx-auto">
          {centerSection}
        </div>
      )}

      {/* Right items */}
      <div className="flex items-center gap-4">
        {children}
        
        {/* Profile Setting Button */}
        <Link 
          href="/settings"
          className="flex items-center gap-3 cursor-pointer group hover:opacity-90 transition-opacity no-underline text-current select-none"
        >
          <div className="text-right hidden sm:block">
            <p className={`text-sm font-bold leading-none ${isDark ? 'text-slate-100' : 'text-gray-950'}`}>
              {profile?.name || user?.email?.split('@')[0] || 'User'}
            </p>
          </div>
          <Avatar 
            name={profile?.name || user?.email?.split('@')[0] || 'User'}
            src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture} 
            size={32}
            className={`border shadow-xs transition-colors ${
              isDark 
                ? 'border-emerald-800/60 group-hover:border-emerald-400' 
                : 'border-gray-200 group-hover:border-green-pri/50'
            }`}
          />
        </Link>
      </div>
    </div>
  );
}

export default Header;
