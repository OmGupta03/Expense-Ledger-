'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Search, Bell } from 'lucide-react';

function Header({ placeholder = "Search...", value, onChange, leftSection, centerSection, children }) {
  const { user, profile } = useAuth();

  return (
    <div className="bg-white border-b border-border-custom px-8 py-4 flex justify-between items-center gap-4 flex-shrink-0 text-left">
      {/* Left side: either leftSection or Search bar */}
      <div className="flex items-center gap-4">
        {leftSection ? (
          leftSection
        ) : (
          <div className="relative w-80">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder={placeholder}
              value={value}
              onChange={onChange}
              className="w-full pl-9 pr-4 py-1.5 bg-[#f1f5f9] border border-transparent rounded-full text-sm text-text-primary placeholder-gray-400 focus:outline-none focus:bg-white focus:border-gray-300 transition-all text-left"
            />
          </div>
        )}
      </div>

      {/* Center section (optional, e.g. for centered search) */}
      {centerSection && (
        <div className="flex-1 flex justify-center max-w-md mx-auto">
          {centerSection}
        </div>
      )}

      {/* Right items */}
      <div className="flex items-center gap-4">
        {children}
        
        <button
          className="p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-gray-100 transition-all cursor-pointer relative border-none bg-transparent"
          title="Notifications"
        >
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 bg-red-500 rounded-full"></span>
        </button>

        {/* Profile Setting Button (clickable user block) */}
        <Link 
          href="/settings"
          className="flex items-center gap-3 cursor-pointer group hover:opacity-90 transition-opacity no-underline text-current select-none"
        >
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-gray-950 leading-tight">
              {profile?.name || user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-[9px] font-extrabold text-gray-400 tracking-wider uppercase mt-0.5">
              Premium Member
            </p>
          </div>
          <img 
            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop" 
            alt="Profile" 
            className="h-8 w-8 rounded-full object-cover border border-gray-200 shadow-xs group-hover:border-green-pri/50 transition-colors"
          />
        </Link>
      </div>
    </div>
  );
}

export default Header;
