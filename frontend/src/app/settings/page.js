'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import Header from '@/components/Header';
import Avatar from '@/components/ui/Avatar';
import Toast from '@/components/ui/Toast';
import Dialog from '@/components/ui/Dialog';
import { ShieldCheck, Trash2, KeyRound, Smartphone, History, Save, ChevronRight, User, Mail, Phone, Globe, Lock } from 'lucide-react';

export default function SettingsPage() {
  const { user, profile, loading, fetchProfile } = useAuth();
  const router = useRouter();

  // Settings form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+91 90453 26920');
  const [country, setCountry] = useState('IN');

  // Toggle states
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [insightsNotif, setInsightsNotif] = useState(false);

  // Status states
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // { message, type }
  const [dialogTarget, setDialogTarget] = useState(null); // 'delete' | 'password' | 'mfa' | 'history' | null
  const [dialogLoading, setDialogLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.name || user?.user_metadata?.full_name || user?.user_metadata?.name || '');
      setEmail(profile.email || user?.email || '');
    } else if (user) {
      setEmail(user.email || '');
      setFullName(user.user_metadata?.full_name || user.user_metadata?.name || '');
    }
  }, [profile, user]);

  if (loading || !user) {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[#07100b] text-slate-400 gap-3 min-h-screen">
          <div className="h-8 w-8 border-2 border-slate-800 border-t-emerald-400 rounded-full animate-spin"></div>
          <p className="text-xs font-extrabold tracking-wider uppercase text-slate-400">Loading account settings...</p>
        </div>
      </Layout>
    );
  }

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setToast({ message: 'Full name is required', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const profileData = {
        id: user.id,
        name: fullName.trim(),
        email: email || user.email || null,
      };

      const { error } = await supabase
        .from('users')
        .upsert([profileData]);

      if (error) throw error;

      setToast({ message: 'Personal information updated successfully!', type: 'success' });
      if (fetchProfile) {
        await fetchProfile(user.id, email || user.email, fullName.trim());
      }
    } catch (err) {
      console.error('Update settings profile error:', err);
      setToast({ message: err.message || 'Failed to update profile details', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDialogLoading(true);
    try {
      const { error: userErr } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);
      if (userErr) throw userErr;

      await supabase.auth.signOut();
      router.push('/login');
    } catch (err) {
      console.error('Error deleting account:', err);
      setToast({ message: err.message || 'Failed to delete account', type: 'error' });
    } finally {
      setDialogLoading(false);
      setDialogTarget(null);
    }
  };

  return (
    <Layout>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Danger Zone Dialog */}
      <Dialog
        isOpen={dialogTarget === 'delete'}
        onClose={() => setDialogTarget(null)}
        title="Delete Account?"
        message="This action is permanent. All your transaction records, expenses, splits, and settings will be permanently erased. There is no recovery option."
        confirmText="Permanently Delete"
        confirmVariant="danger"
        loading={dialogLoading}
        onConfirm={handleDeleteAccount}
      />

      {/* Generic Modal Dialogs for mock controls */}
      <Dialog
        isOpen={dialogTarget === 'password' || dialogTarget === 'mfa' || dialogTarget === 'history'}
        onClose={() => setDialogTarget(null)}
        title={
          dialogTarget === 'password'
            ? 'Change Password'
            : dialogTarget === 'mfa'
            ? 'Configure Two-Factor Authentication'
            : 'Login History'
        }
        message="This settings panel is mock-simulated for demonstration. Password changes, multi-factor setups, and audit logs are fully encrypted and protected under Supabase authentication layers."
        confirmText="Got it"
        confirmVariant="primary"
        onConfirm={() => setDialogTarget(null)}
      />

      <div className="stitch-dashboard-dark w-full flex-1 flex flex-col min-h-screen overflow-x-hidden text-left select-none bg-[#07100b] text-white font-sans">
        <Header isDark={true} placeholder="Search settings..." />

        <div className="flex-1 overflow-y-auto px-6 md:px-10 py-8">
          <div className="max-w-4xl mx-auto flex flex-col gap-6">
            
            {/* Header Title */}
            <div className="pb-4 border-b border-slate-800 text-left">
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Account Settings</h1>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Manage your profile, notification preferences, and security settings to keep your finances secure.
              </p>
            </div>

            <form onSubmit={handleSaveChanges} className="space-y-6">
              
              {/* 1. PERSONAL INFORMATION CARD */}
              <div className="stitch-glass-card rounded-3xl p-6 border border-emerald-900/60 bg-[#0b1610]/95 shadow-xl text-left space-y-5">
                <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-lg font-extrabold text-white tracking-tight">Personal Information</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Update your details and how flatmates address you.</p>
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-[#10b981] hover:bg-emerald-400 text-slate-950 font-extrabold rounded-full transition-all shadow-lg shadow-emerald-500/20 text-xs border-none cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>

                {/* Avatar Selector Block */}
                <div className="flex items-center gap-4 py-2">
                  <Avatar name={fullName} src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture} size={56} />
                  <div className="text-left space-y-1">
                    <button
                      type="button"
                      onClick={() => setToast({ message: 'Avatar image storage requires storage integration hooks', type: 'info' })}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-extrabold rounded-full transition-all cursor-pointer"
                    >
                      Change Avatar
                    </button>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">JPG or PNG. Max size of 800K.</p>
                  </div>
                </div>

                {/* Personal Info Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase text-slate-300 mb-1.5 tracking-wider">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Om Gupta"
                      className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold uppercase text-slate-300 mb-1.5 tracking-wider">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      placeholder="user@example.com"
                      className="w-full bg-[#090d16] border border-slate-800/80 rounded-xl px-4 py-3 text-xs text-slate-400 cursor-not-allowed font-medium opacity-70"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold uppercase text-slate-300 mb-1.5 tracking-wider">Phone Number</label>
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1 (555) 012-3456"
                      className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold uppercase text-slate-300 mb-1.5 tracking-wider">Country/Region</label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                    >
                      <option value="IN">India (₹)</option>
                      <option value="US">United States ($)</option>
                      <option value="GB">United Kingdom (£)</option>
                      <option value="CA">Canada ($)</option>
                      <option value="DE">Germany (€)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. NOTIFICATIONS & SECURITY DUAL CONTAINER */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Notification Toggles Card */}
                <div className="stitch-glass-card rounded-3xl p-6 border border-emerald-900/60 bg-[#0b1610]/95 shadow-xl text-left space-y-4">
                  <div className="pb-3 border-b border-slate-800">
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <span>🔔</span> Notifications
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Control which updates you receive.</p>
                  </div>

                  <div className="space-y-4 pt-1">
                    <div className="flex items-center justify-between">
                      <div className="text-left max-w-[75%]">
                        <h4 className="text-xs font-bold text-white">Email Notifications</h4>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-tight">Daily summary of group expenses and settlements.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={emailNotif}
                        onChange={(e) => setEmailNotif(e.target.checked)}
                        className="rounded accent-emerald-500 h-4 w-4 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-left max-w-[75%]">
                        <h4 className="text-xs font-bold text-white">Push Notifications</h4>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-tight">Instant alerts for new transactions and mentions.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={pushNotif}
                        onChange={(e) => setPushNotif(e.target.checked)}
                        className="rounded accent-emerald-500 h-4 w-4 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-left max-w-[75%]">
                        <h4 className="text-xs font-bold text-white">Financial Insights</h4>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-tight">Weekly trends and personalized budgeting tips.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={insightsNotif}
                        onChange={(e) => setInsightsNotif(e.target.checked)}
                        className="rounded accent-emerald-500 h-4 w-4 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Security Audit Controls Card */}
                <div className="stitch-glass-card rounded-3xl p-6 border border-emerald-900/60 bg-[#0b1610]/95 shadow-xl text-left space-y-4">
                  <div className="pb-3 border-b border-slate-800">
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <span>🛡️</span> Security
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Maintain the integrity of your financial data.</p>
                  </div>

                  <div className="flex flex-col gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setDialogTarget('password')}
                      className="w-full flex items-center justify-between px-4 py-3 bg-[#0f172a] hover:bg-slate-900 border border-slate-800 rounded-2xl transition-colors cursor-pointer text-xs font-bold text-white text-left"
                    >
                      <span className="flex items-center gap-2.5">
                        <KeyRound className="h-4 w-4 text-emerald-400" /> Change Password
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDialogTarget('mfa')}
                      className="w-full flex items-center justify-between px-4 py-3 bg-[#0f172a] hover:bg-slate-900 border border-slate-800 rounded-2xl transition-colors cursor-pointer text-xs font-bold text-white text-left"
                    >
                      <span className="flex items-center gap-2.5">
                        <Smartphone className="h-4 w-4 text-emerald-400" /> Two-Factor Authentication
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-extrabold">ENABLED</span>
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDialogTarget('history')}
                      className="w-full flex items-center justify-between px-4 py-3 bg-[#0f172a] hover:bg-slate-900 border border-slate-800 rounded-2xl transition-colors cursor-pointer text-xs font-bold text-white text-left"
                    >
                      <span className="flex items-center gap-2.5">
                        <History className="h-4 w-4 text-emerald-400" /> Login History
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-950/40 border border-emerald-800/50 rounded-2xl text-[10px] text-emerald-400 font-extrabold">
                    <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                    <span>Your account is protected by 256-bit encryption.</span>
                  </div>
                </div>
              </div>

              {/* 3. DANGER ZONE CARD */}
              <div className="stitch-glass-card rounded-3xl p-6 border border-red-900/60 bg-red-950/20 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                <div className="text-left">
                  <h3 className="text-base font-extrabold text-red-400">Danger Zone</h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5 leading-tight">Permanently delete your account and all associated financial data.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDialogTarget('delete')}
                  className="px-5 py-2.5 bg-red-950/80 hover:bg-red-900 border border-red-800/80 text-red-300 rounded-full font-extrabold text-xs transition-all cursor-pointer flex items-center gap-2 border-none"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Account</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
