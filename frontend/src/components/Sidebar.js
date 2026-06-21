import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { fetchUserGroups } from '@/lib/api';
import Avatar from './Avatar';
import CreateGroupModal from './CreateGroupModal';

function NavItem({ icon, label, to, disabled, isActive }) {
  if (disabled) {
    return (
      <div
        className="flex items-center gap-3 px-5 py-3 text-green-200/30 font-medium text-sm cursor-not-allowed select-none opacity-40 transition-all text-left"
        title="Create a group first to access this section"
      >
        <span className="text-base">{icon}</span>
        <span>{label}</span>
      </div>
    );
  }

  return (
    <Link
      href={to}
      className={`flex items-center gap-3 px-5 py-3 font-semibold text-sm cursor-pointer transition-all duration-150 border-l-3 text-left ${
        isActive
          ? 'bg-white/15 text-white border-white'
          : 'text-sidebar-text border-transparent hover:bg-white/8 hover:text-white'
      }`}
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

function Sidebar() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();

  const groupId = params.id;
  const tab = searchParams.get('tab') || 'expenses';

  const [groups, setGroups] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const dropdownRef = useRef(null);

  const fetchGroups = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchUserGroups(user.id);
      setGroups(data);
    } catch (err) {
      console.error('Sidebar fetch groups error:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchGroups();
    }
  }, [user, groupId, fetchGroups]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  const activeGroup = groups.find(g => g.id === groupId);

  // Determine fallback/most recently viewed Group ID
  let resolvedGroupId = null;
  if (groupId) {
    resolvedGroupId = groupId;
  } else {
    // Try localStorage
    const lastId = typeof window !== 'undefined' ? localStorage.getItem('lastGroupId') : null;
    const isValid = groups.some(g => g.id === lastId);
    if (lastId && isValid) {
      resolvedGroupId = lastId;
    } else if (groups.length > 0) {
      resolvedGroupId = groups[0].id;
    }
  }

  const hasGroupsTotal = groups.length > 0;
  const isInsideGroup = !!groupId;

  // Active section checkers
  const checkActive = (pathType) => {
    if (!isInsideGroup) return false;
    
    if (pathType === 'expenses') {
      return pathname === `/groups/${groupId}` && tab === 'expenses';
    }
    if (pathType === 'members') {
      return pathname === `/groups/${groupId}` && tab === 'members';
    }
    if (pathType === 'settlements') {
      return pathname === `/groups/${groupId}` && tab === 'settlements';
    }
    if (pathType === 'import') {
      return pathname === `/groups/${groupId}/import`;
    }
    return false;
  };

  const handleGroupSelect = (selectedId) => {
    setIsDropdownOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastGroupId', selectedId);
    }
    
    // Maintain sub-view context if switching groups
    if (pathname.includes('/import')) {
      router.push(`/groups/${selectedId}/import`);
    } else if (tab === 'members') {
      router.push(`/groups/${selectedId}?tab=members`);
    } else if (tab === 'settlements') {
      router.push(`/groups/${selectedId}?tab=settlements`);
    } else {
      router.push(`/groups/${selectedId}`);
    }
  };

  return (
    <aside className="sidebar flex flex-col justify-between select-none relative z-45">
      <div>
        {/* Logo and Brand */}
        <div className="sidebar-logo flex items-center gap-2.5 px-5 py-5 font-black text-lg border-b border-white/5 bg-slate-950/10 text-left">
          <span className="logo-icon text-xl text-green-200">⬡</span>
          <span className="logo-text tracking-tight text-white font-extrabold">Expense Ledger</span>
        </div>

        {/* Group Context Switcher Dropdown (if inside group) */}
        {isInsideGroup && activeGroup && (
          <div className="px-5 py-3 border-b border-white/5 relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between bg-white/10 hover:bg-white/15 text-white font-semibold text-xs px-3 py-2 rounded-lg cursor-pointer transition-all border border-white/10"
            >
              <span className="truncate max-w-[140px] text-left">{activeGroup.name}</span>
              <span className="text-[10px] text-green-200/80">▼</span>
            </button>

            {/* Dropdown Options overlay */}
            {isDropdownOpen && (
              <div className="absolute left-5 right-5 top-12 mt-1.5 bg-slate-900 border border-white/10 rounded-lg shadow-xl overflow-hidden z-50 text-xs">
                <div className="max-h-40 overflow-y-auto divide-y divide-white/5">
                  {groups.map(g => {
                    const gId = g.id;
                    const isActive = gId === groupId;
                    return (
                      <button
                        key={gId}
                        onClick={() => handleGroupSelect(gId)}
                        className={`w-full text-left px-3.5 py-2.5 transition-colors cursor-pointer block truncate ${
                          isActive
                            ? 'bg-green-pri text-white font-bold'
                            : 'text-slate-200 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {g.name}
                      </button>
                    );
                  })}
                </div>
                <div className="border-t border-white/10 bg-slate-950">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setShowCreateModal(true);
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-green-300 hover:text-white font-bold transition-all cursor-pointer"
                  >
                    + Create New Group
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Nav */}
        <nav className="sidebar-nav py-3.5 flex flex-col gap-0.5">
          {/* Dashboard (🏠) */}
          <NavItem
            icon="🏠"
            label="Dashboard"
            to="/dashboard"
            isActive={pathname === '/dashboard'}
          />

          {/* Expenses (📋) */}
          <NavItem
            icon="📋"
            label="Expenses"
            to={resolvedGroupId ? `/groups/${resolvedGroupId}?tab=expenses` : '#'}
            disabled={!hasGroupsTotal}
            isActive={checkActive('expenses')}
          />

          {/* Members (👥) */}
          <NavItem
            icon="👥"
            label="Members"
            to={resolvedGroupId ? `/groups/${resolvedGroupId}?tab=members` : '#'}
            disabled={!hasGroupsTotal}
            isActive={checkActive('members')}
          />

          {/* Settlements (⚖️) */}
          <NavItem
            icon="⚖️"
            label="Settlements"
            to={resolvedGroupId ? `/groups/${resolvedGroupId}?tab=settlements` : '#'}
            disabled={!hasGroupsTotal}
            isActive={checkActive('settlements')}
          />

          {/* Import CSV (📁) */}
          <NavItem
            icon="📁"
            label="Import CSV"
            to={resolvedGroupId ? `/groups/${resolvedGroupId}/import` : '#'}
            disabled={!hasGroupsTotal}
            isActive={checkActive('import')}
          />

          {/* Bottom create group launcher */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-3 px-5 py-3.5 mt-4 text-green-200/60 hover:text-white font-bold text-xs transition-all cursor-pointer border-t border-white/5 w-full text-left"
          >
            <span>➕</span>
            <span>Create New Group</span>
          </button>
        </nav>
      </div>

      {/* User Footer info */}
      <div className="sidebar-footer flex items-center gap-3 px-5 py-4 border-t border-white/10 text-sidebar-text text-sm">
        <Avatar name={profile?.name || user?.email || 'User'} size={32} />
        <div className="flex-1 min-w-0 text-left">
          <p className="font-semibold text-white truncate text-xs">{profile?.name || 'User'}</p>
          <p className="text-[10px] text-green-200/60 truncate">{user?.email || ''}</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-green-200/60 hover:text-white text-lg font-bold p-1 cursor-pointer transition-all hover:scale-105"
          title="Sign Out"
        >
          →
        </button>
      </div>

      {/* Creation Modal */}
      {showCreateModal && (
        <CreateGroupModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => fetchGroups()}
        />
      )}
    </aside>
  );
}

export default Sidebar;
