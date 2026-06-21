import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createGroup } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

function CreateGroupModal({ isOpen, onClose, onSuccess }) {
  const { user, profile } = useAuth();
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
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-border-custom p-6 rounded-2xl w-full max-w-md shadow-2xl relative text-left">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary font-bold text-sm cursor-pointer"
        >
          ✕
        </button>

        <h3 className="text-lg font-extrabold text-text-primary mb-1">Create New Flat Group</h3>
        <p className="text-xs text-text-muted mb-4">Set up your shared flatmate group and start tracking bills.</p>
        
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-owe p-3 rounded-lg text-xs font-semibold">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Group Name */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">Group Name *</label>
            <input
              type="text"
              required
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Apartment roommates"
              className="w-full bg-grey-bg border border-border-custom rounded-xl px-3.5 py-2.5 text-text-primary placeholder-slate-450 focus:outline-none focus:border-green-pri text-sm"
            />
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-border-custom text-xs text-text-muted">
            ℹ️ You&apos;ll be able to invite your flatmates and add expenses once the group is created.
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 bg-green-pri hover:bg-green-light text-white font-semibold rounded-xl shadow-md transition-all cursor-pointer text-sm font-bold disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateGroupModal;
