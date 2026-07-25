'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import Header from '@/components/Header';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import Avatar from '@/components/ui/Avatar';
import Toast from '@/components/ui/Toast';
import Dialog from '@/components/ui/Dialog';
import { ShieldCheck, Trash2, KeyRound, Smartphone, History, Save, Sparkles, User, Mail, Phone, Globe } from 'lucide-react';

export default function SettingsPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  // Settings form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+1 (555) 012-3456');
  const [country, setCountry] = useState('US');

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
      setFullName(profile.name || '');
      setEmail(profile.email || '');
    }
  }, [profile]);

  if (loading || !user) {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-bg-primary text-text-muted gap-3">
          <div className="h-7 w-7 border-2 border-border-custom border-t-green-pri rounded-full animate-spin"></div>
          <p className="text-xs font-bold">Loading account settings...</p>
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
      const { error } = await supabase
        .from('users')
        .update({ name: fullName.trim() })
        .eq('id', user.id);

      if (error) throw error;
      setToast({ message: 'Personal information updated successfully!', type: 'success' });
    } catch (err) {
      console.error('Update settings profile error:', err);
      setToast({ message: err.message || 'Failed to update profile name', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDialogLoading(true);
    try {
      // 1. Delete user record in public.users (cascades or drops reference)
      const { error: userErr } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);
      if (userErr) throw userErr;

      // 2. Sign out auth user
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

      <div className="w-full flex-1 flex flex-col bg-bg-primary overflow-hidden h-full text-left">
        <Header placeholder="Search settings..." />

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8 w-full flex flex-col gap-6">
            <PageHeader
            title="Account Settings"
            subtitle="Manage your profile, notification preferences, and security settings to keep your finances secure."
            breadcrumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Settings' }
            ]}
          />

          <form onSubmit={handleSaveChanges} className="space-y-6">
            {/* 1. PERSONAL INFORMATION CARD */}
            <Card className="flex flex-col gap-5 text-left relative overflow-hidden">
              <div className="flex justify-between items-center pb-3.5 border-b border-border-custom/50">
                <div>
                  <h3 className="text-sm font-extrabold text-text-primary">Personal Information</h3>
                  <p className="text-[10px] text-text-muted font-semibold mt-0.5">Update your details and how we should address you.</p>
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={saving}
                  icon={Save}
                >
                  Save Changes
                </Button>
              </div>

              {/* Avatar Selector Block */}
              <div className="flex items-center gap-4">
                <Avatar name={fullName} size="xl" />
                <div className="text-left space-y-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setToast({ message: 'Avatar image storage requires storage integration hooks', type: 'info' })}
                  >
                    Change Avatar
                  </Button>
                  <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">JPG or PNG. Max size of 800K.</p>
                </div>
              </div>

              {/* Personal Info Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name *"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Om Gupta"
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  disabled
                  placeholder="e.g. user@example.com"
                  title="Email cannot be modified directly"
                  className="bg-slate-50 cursor-not-allowed border-slate-200"
                />
                <Input
                  label="Phone Number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 012-3456"
                />
                <Select
                  label="Country/Region"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  options={[
                    { value: 'US', label: 'United States' },
                    { value: 'IN', label: 'India' },
                    { value: 'GB', label: 'United Kingdom' },
                    { value: 'CA', label: 'Canada' },
                    { value: 'DE', label: 'Germany' }
                  ]}
                />
              </div>
            </Card>

            {/* 2. NOTIFICATIONS & SECURITY DUAL CONTAINER */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Notification Toggles Card */}
              <Card className="flex flex-col gap-4">
                <div className="pb-3 border-b border-border-custom/50">
                  <h3 className="text-sm font-extrabold text-text-primary flex items-center gap-1.5">
                    <span>🔔</span> Notifications
                  </h3>
                  <p className="text-[10px] text-text-muted font-semibold mt-0.5">Control which updates you receive and how they are delivered.</p>
                </div>

                <div className="space-y-4 pt-1">
                  <div className="flex items-center justify-between">
                    <div className="text-left max-w-[70%]">
                      <h4 className="text-xs font-bold text-text-primary">Email Notifications</h4>
                      <p className="text-[10px] text-text-muted font-semibold mt-0.5 leading-tight">Daily summary of group expenses and settlements.</p>
                    </div>
                    <Switch checked={emailNotif} onChange={setEmailNotif} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-left max-w-[70%]">
                      <h4 className="text-xs font-bold text-text-primary">Push Notifications</h4>
                      <p className="text-[10px] text-text-muted font-semibold mt-0.5 leading-tight">Instant alerts for new transactions and mentions.</p>
                    </div>
                    <Switch checked={pushNotif} onChange={setPushNotif} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-left max-w-[70%]">
                      <h4 className="text-xs font-bold text-text-primary">Financial Insights</h4>
                      <p className="text-[10px] text-text-muted font-semibold mt-0.5 leading-tight">Weekly trends and personalized budgeting tips.</p>
                    </div>
                    <Switch checked={insightsNotif} onChange={setInsightsNotif} />
                  </div>
                </div>
              </Card>

              {/* Security Audit Controls Card */}
              <Card className="flex flex-col gap-4">
                <div className="pb-3 border-b border-border-custom/50">
                  <h3 className="text-sm font-extrabold text-text-primary flex items-center gap-1.5">
                    <span>🛡️</span> Security
                  </h3>
                  <p className="text-[10px] text-text-muted font-semibold mt-0.5">Maintain the integrity of your financial data with advanced protection.</p>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setDialogTarget('password')}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100/70 border border-border-custom rounded-2xl transition-colors cursor-pointer text-xs font-bold text-text-primary text-left"
                  >
                    <span className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-text-muted" /> Change Password
                    </span>
                    <span className="text-text-muted text-lg">→</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDialogTarget('mfa')}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100/70 border border-border-custom rounded-2xl transition-colors cursor-pointer text-xs font-bold text-text-primary text-left"
                  >
                    <span className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-text-muted" /> Two-Factor Authentication
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-green-50 text-green-pri border border-green-200">ENABLED</span>
                    </span>
                    <span className="text-text-muted text-lg">→</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDialogTarget('history')}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100/70 border border-border-custom rounded-2xl transition-colors cursor-pointer text-xs font-bold text-text-primary text-left"
                  >
                    <span className="flex items-center gap-2">
                      <History className="h-4 w-4 text-text-muted" /> Login History
                    </span>
                    <span className="text-text-muted text-lg">→</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 bg-green-50/50 border border-green-pri/10 rounded-xl text-[10px] text-green-pri font-bold">
                  <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                  <span>Your account is protected by 256-bit encryption.</span>
                </div>
              </Card>
            </div>

            {/* 3. DANGER ZONE CARD */}
            <Card className="border border-red-200 bg-red-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-left">
                <h3 className="text-sm font-extrabold text-red-owe">Danger Zone</h3>
                <p className="text-[10px] text-text-muted font-semibold mt-0.5 leading-tight">Permanently delete your account and all associated financial data.</p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setDialogTarget('delete')}
                icon={Trash2}
              >
                Delete Account
              </Button>
            </Card>
          </form>
        </div>
      </div>
      </div>
    </Layout>
  );
}
