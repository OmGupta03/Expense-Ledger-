'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  signUp: async () => {},
  signIn: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to fetch the profile from public.users with client-side auto-creation fallback
  // Helper to fetch the profile from public.users with client-side auto-creation and sync fallback
  const fetchProfile = async (userId, userEmail = '', userName = '') => {
    try {
      let { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!data && userEmail) {
        const { data: emailData } = await supabase
          .from('users')
          .select('*')
          .eq('email', userEmail)
          .maybeSingle();
        if (emailData) {
          data = emailData;
        }
      }

      if (data) {
        const updates = {};
        if (!data.email && userEmail) updates.email = userEmail;
        if ((!data.name || data.name === 'User') && userName) updates.name = userName;

        if (Object.keys(updates).length > 0) {
          const { data: updatedData } = await supabase
            .from('users')
            .update(updates)
            .eq('id', data.id)
            .select()
            .maybeSingle();
          if (updatedData) data = updatedData;
        }

        setProfile(data);
      } else {
        const realName = userName || (userEmail ? userEmail.split('@')[0] : 'User');
        const newProfile = {
          id: userId,
          email: userEmail || null,
          name: realName,
        };

        const { data: insertedData } = await supabase
          .from('users')
          .upsert([newProfile])
          .select()
          .maybeSingle();

        setProfile(insertedData || newProfile);
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
    }
  };

  useEffect(() => {
    // Background ping to backend API health check
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    fetch(`${backendUrl}/api/health`).catch(() => {});

    const hasOAuthParams = typeof window !== 'undefined' && (
      window.location.hash.includes('access_token=') ||
      window.location.search.includes('code=') ||
      window.location.hash.includes('error=')
    );

    // Fast initial session hydration from localStorage / client cache
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        const oauthName = session.user.user_metadata?.full_name || 
                          session.user.user_metadata?.name || 
                          session.user.user_metadata?.preferred_username ||
                          session.user.email?.split('@')[0];
        fetchProfile(session.user.id, session.user.email, oauthName).catch(() => {});
        setLoading(false);
      } else if (!hasOAuthParams) {
        setLoading(false);
      }
    }).catch(() => {
      if (!hasOAuthParams) setLoading(false);
    });

    // Listen for subsequent auth state updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser(session.user);
          const oauthName = session.user.user_metadata?.full_name || 
                            session.user.user_metadata?.name || 
                            session.user.user_metadata?.preferred_username ||
                            session.user.email?.split('@')[0];
          fetchProfile(session.user.id, session.user.email, oauthName).catch(() => {});
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signUp = async (email, password, name) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          name: name || email.split('@')[0],
        },
      },
    });

    if (error) {
      setLoading(false);
      throw error;
    }

    if (data?.user) {
      setUser(data.user);
      // Wait briefly, then fetch/ensure the profile is created
      setTimeout(() => {
        const oauthName = data.user.user_metadata?.full_name || data.user.user_metadata?.name || name;
        fetchProfile(
          data.user.id,
          data.user.email,
          oauthName
        );
        setLoading(false);
      }, 1000);
    } else {
      setLoading(false);
    }

    return data;
  };

  const signIn = async (email, password) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      throw error;
    }

    if (data?.user) {
      setUser(data.user);
      const oauthName = data.user.user_metadata?.full_name || data.user.user_metadata?.name;
      await fetchProfile(
        data.user.id,
        data.user.email,
        oauthName
      );
    }
    setLoading(false);
    return data;
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard`,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      setLoading(false);
      throw error;
    }

    if (data?.user) {
      setUser(data.user);
      const oauthName = data.user.user_metadata?.full_name || data.user.user_metadata?.name || 'Google Guest';
      await fetchProfile(data.user.id, data.user.email, oauthName);
    }
    setLoading(false);
    return data;
  };

  const signOut = async () => {
    setLoading(true);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('supabase_session');
      localStorage.removeItem('lastGroupId');
      localStorage.removeItem('google_client_id');
      window.dispatchEvent(new Event('storage'));
    }
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signInWithGoogle, signOut, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
