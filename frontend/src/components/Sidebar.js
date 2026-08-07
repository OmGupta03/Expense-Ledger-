import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { fetchUserGroups } from '@/lib/api';
import CreateGroupModal from './CreateGroupModal';
import { LayoutGrid, CreditCard, Users, RefreshCw, FileSpreadsheet, Settings, LogOut, Plus, Wallet, Sparkles } from 'lucide-react';

function NavItem({ icon: Icon, label, to, isActive, onClick }) {
  const classes = `w-[calc(100%-24px)] flex items-center gap-3 px-4 py-2.5 mx-3 font-semibold text-xs cursor-pointer transition-all duration-150 rounded-full text-left border-none ${
    isActive
      ? 'bg-[#143823] text-[#4ade80] shadow-md font-extrabold border border-[#1b4e31]'
      : 'text-slate-300 hover:bg-[#11241a] hover:text-white'
  }`;

  if (onClick) {
    return (
      <button onClick={onClick} className={classes}>
        {Icon && <Icon className="h-4 w-4" />}
        <span>{label}</span>
      </button>
    );
  }

  return (
    <Link href={to} className={classes}>
      {Icon && <Icon className="h-4 w-4" />}
      <span>{label}</span>
    </Link>
  );
}

function Sidebar() {
  const { user, signOut } = useAuth();
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

  let resolvedGroupId = null;
  if (groupId) {
    resolvedGroupId = groupId;
  } else {
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

  const checkActive = (pathType) => {
    if (!isInsideGroup) return false;
    if (pathType === 'expenses') return pathname === `/groups/${groupId}` && tab === 'expenses';
    if (pathType === 'members') return pathname === `/groups/${groupId}` && tab === 'members';
    if (pathType === 'settlements') return pathname === `/groups/${groupId}` && tab === 'settlements';
    if (pathType === 'import') return pathname === `/groups/${groupId}/import`;
    return false;
  };

  const handleGroupSelect = (selectedId) => {
    setIsDropdownOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastGroupId', selectedId);
    }
    
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
    <aside className="sidebar flex flex-col justify-between select-none relative z-45 h-full border-r border-[#14261c] bg-[#07100b] text-slate-200 transition-colors w-64 flex-shrink-0">
      <div className="flex flex-col flex-1 h-full">
        {/* Logo and Brand matching Stitch design */}
        <div className="flex items-center gap-3 px-6 py-5 text-left border-b border-[#14261c] bg-[#07100b]">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 flex-shrink-0 shadow-lg font-bold">
            <Wallet className="h-5 w-5 text-slate-950" />
          </div>
          <div>
            <div className="font-extrabold text-base tracking-tight leading-none text-white">
              SmartCash
            </div>
            <div className="text-[10px] mt-1 leading-none font-semibold text-slate-400">
              Student Group Finances
            </div>
          </div>
        </div>

        {/* Group Context Switcher Dropdown */}
        {isInsideGroup && activeGroup && (
          <div className="px-5 py-3 border-b border-[#14261c] relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between font-semibold text-xs px-3 py-2 rounded-xl cursor-pointer transition-all border bg-slate-900/90 text-slate-200 border-slate-800 hover:bg-slate-800"
            >
              <span className="truncate max-w-[140px] text-left">{activeGroup.name}</span>
              <span className="text-[10px] opacity-60">▼</span>
            </button>

            {isDropdownOpen && (
              <div className="absolute left-5 right-5 top-12 mt-1.5 bg-[#0b1810] border border-emerald-900/80 rounded-xl shadow-2xl overflow-hidden z-50 text-xs text-slate-200">
                <div className="max-h-40 overflow-y-auto divide-y divide-slate-800">
                  {groups.map(g => {
                    const gId = g.id;
                    const isActive = gId === groupId;
                    return (
                      <button
                        key={gId}
                        onClick={() => handleGroupSelect(gId)}
                        className={`w-full text-left px-3.5 py-2.5 transition-colors cursor-pointer block truncate ${
                          isActive
                            ? 'bg-[#143823] text-[#4ade80] font-bold'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {g.name}
                      </button>
                    );
                  })}
                </div>
                <div className="border-t border-slate-800 bg-slate-950">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setShowCreateModal(true);
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-[#4ade80] hover:text-emerald-300 font-bold transition-all cursor-pointer"
                  >
                    + Create New Group
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Nav */}
        <nav className="sidebar-nav py-4 flex flex-col flex-1 gap-1.5 h-full">
          <NavItem
            icon={LayoutGrid}
            label="Dashboard"
            to="/dashboard"
            isActive={pathname === '/dashboard'}
          />

          <NavItem
            icon={CreditCard}
            label="Expenses"
            to={resolvedGroupId ? `/groups/${resolvedGroupId}?tab=expenses` : '#'}
            onClick={!hasGroupsTotal ? () => setShowCreateModal(true) : undefined}
            isActive={checkActive('expenses')}
          />

          <NavItem
            icon={Users}
            label="Members"
            to={resolvedGroupId ? `/groups/${resolvedGroupId}?tab=members` : '#'}
            onClick={!hasGroupsTotal ? () => setShowCreateModal(true) : undefined}
            isActive={checkActive('members')}
          />

          <NavItem
            icon={RefreshCw}
            label="Settlements"
            to={resolvedGroupId ? `/groups/${resolvedGroupId}?tab=settlements` : '#'}
            onClick={!hasGroupsTotal ? () => setShowCreateModal(true) : undefined}
            isActive={checkActive('settlements')}
          />

          <NavItem
            icon={FileSpreadsheet}
            label="CSV Importer"
            to={resolvedGroupId ? `/groups/${resolvedGroupId}/import` : '#'}
            onClick={!hasGroupsTotal ? () => setShowCreateModal(true) : undefined}
            isActive={checkActive('import')}
          />

          <NavItem
            icon={Sparkles}
            label="AI Insights"
            to="/dashboard?ai=open"
            isActive={searchParams.get('ai') === 'open'}
          />

          <div className="flex-1 min-h-[20px]"></div>
        </nav>
      </div>

      {/* User Footer */}
      <div className="py-3 flex flex-col gap-0.5 border-t border-[#14261c] bg-[#07100b]">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-4 py-2 mx-3 font-semibold text-xs cursor-pointer rounded-full text-left transition-all duration-150 ${
            pathname === '/settings'
              ? 'bg-[#143823] text-[#4ade80] font-bold'
              : 'text-slate-300 hover:bg-[#11241a] hover:text-white'
          }`}
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2 mx-3 font-semibold text-xs cursor-pointer rounded-full text-left border-none bg-transparent text-slate-300 hover:bg-[#11241a] hover:text-white w-[calc(100%-24px)] transition-all duration-150"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>

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
