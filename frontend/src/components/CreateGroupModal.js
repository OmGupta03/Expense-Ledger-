import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createGroup } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { X, Users } from 'lucide-react';

function CreateGroupModal({ isOpen, onClose, onSuccess }) {
  const { user } = useAuth();
  const router = useRouter();

  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }

    try {
      setError('');
      setLoading(true);

      const group = await createGroup(groupName.trim(), user.id);
      
      // Save new group ID as the last viewed group
      localStorage.setItem('lastGroupId', group.id);

      setLoading(false);
      onClose();
      
      if (onSuccess) {
        onSuccess(group);
      }

      // Navigate to the newly created group details page
      router.push(`/groups/${group.id}`);

    } catch (err) {
      console.error('Create group error:', err);
      setLoading(false);
      setError(err.message || 'Failed to create group');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
      <div className="stitch-glass-card border border-emerald-900/60 bg-[#0b1610]/95 p-8 rounded-3xl w-full max-w-md shadow-2xl relative text-left space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-900 transition-colors bg-transparent border-none cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
          <div className="h-10 w-10 rounded-2xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-white tracking-tight">Create New Flat Group</h3>
            <p className="text-xs text-slate-400 font-medium">Set up your shared flatmate group and start tracking bills.</p>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-950/80 border border-red-900 text-red-300 p-3.5 rounded-2xl text-xs font-semibold">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Group Name */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase text-slate-300 mb-1.5 tracking-wider">Group Name *</label>
            <input
              type="text"
              required
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Apartment roommates"
              className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          <div className="bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-800/50 text-xs text-slate-300 font-medium">
            ℹ️ You&apos;ll be able to invite your flatmates and add expenses once the group is created.
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3.5 bg-[#10b981] hover:bg-emerald-400 text-slate-950 font-extrabold rounded-full shadow-lg shadow-emerald-500/20 transition-all cursor-pointer text-xs disabled:opacity-50 border-none"
          >
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateGroupModal;
