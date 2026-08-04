import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

const isLocalMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder') || 
                    process.env.NEXT_PUBLIC_USE_LOCAL_DB === 'true';

let supabaseClient;

if (!isLocalMode) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
} else {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
  
  supabaseClient = {
    auth: {
      getSession: async () => {
        try {
          const sessionStr = localStorage.getItem('supabase_session');
          if (sessionStr) {
            const session = JSON.parse(sessionStr);
            return { data: { session }, error: null };
          }
        } catch (e) {}
        return { data: { session: null }, error: null };
      },
      onAuthStateChange: (callback) => {
        const getSessionAndFire = async () => {
          try {
            const sessionStr = localStorage.getItem('supabase_session');
            const session = sessionStr ? JSON.parse(sessionStr) : null;
            callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
          } catch (e) {
            callback('SIGNED_OUT', null);
          }
        };
        
        // Fire immediately
        getSessionAndFire();

        const handler = (e) => {
          if (e.key === 'supabase_session') {
            getSessionAndFire();
          }
        };
        
        if (typeof window !== 'undefined') {
          window.addEventListener('storage', handler);
        }

        return {
          data: {
            subscription: {
              unsubscribe: () => {
                if (typeof window !== 'undefined') {
                  window.removeEventListener('storage', handler);
                }
              }
            }
          }
        };
      },
      signUp: async ({ email, password, options }) => {
        try {
          const res = await fetch(`${BACKEND_URL}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name: options?.data?.name })
          });
          const data = await res.json();
          if (!res.ok) {
            return { data: null, error: new Error(data.error || 'Signup failed') };
          }
          localStorage.setItem('supabase_session', JSON.stringify(data.session));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('storage'));
          }
          return { data: { user: data.session.user }, error: null };
        } catch (err) {
          return { data: null, error: err };
        }
      },
      signInWithPassword: async ({ email, password }) => {
        try {
          const res = await fetch(`${BACKEND_URL}/api/auth/signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const data = await res.json();
          if (!res.ok) {
            return { data: null, error: new Error(data.error || 'Signin failed') };
          }
          localStorage.setItem('supabase_session', JSON.stringify(data.session));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('storage'));
          }
          return { data: { user: data.session.user }, error: null };
        } catch (err) {
          return { data: null, error: err };
        }
      },
      signOut: async () => {
        localStorage.removeItem('supabase_session');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('storage'));
        }
        return { error: null };
      },
      signInWithOAuth: async ({ provider }) => {
        try {
          const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || (typeof window !== 'undefined' ? localStorage.getItem('google_client_id') : null);

          // If Google Client ID is available, trigger real Google Auth Popup via Google Identity Services Token Client
          if (clientId && typeof window !== 'undefined') {
            return new Promise((resolve) => {
              const startGoogleOAuth = () => {
                try {
                  if (window.google?.accounts?.oauth2) {
                    const tokenClient = window.google.accounts.oauth2.initTokenClient({
                      client_id: clientId,
                      scope: 'email profile openid',
                      callback: async (tokenResponse) => {
                        if (tokenResponse.error) {
                          return resolve({ data: null, error: new Error(tokenResponse.error_description || 'Google sign-in cancelled or failed') });
                        }
                        try {
                          // Fetch real Google user profile info
                          const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                            headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                          });
                          const googleUser = await userinfoRes.json();

                          const res = await fetch(`${BACKEND_URL}/api/auth/google`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              email: googleUser.email,
                              name: googleUser.name,
                              picture: googleUser.picture,
                              googleId: googleUser.sub
                            })
                          });

                          const data = await res.json();
                          if (!res.ok) {
                            return resolve({ data: null, error: new Error(data.error || 'Google backend authentication failed') });
                          }
                          localStorage.setItem('supabase_session', JSON.stringify(data.session));
                          window.dispatchEvent(new Event('storage'));
                          resolve({ data: { user: data.session.user }, error: null });
                        } catch (e) {
                          resolve({ data: null, error: e });
                        }
                      }
                    });
                    tokenClient.requestAccessToken();
                  } else {
                    // Fallback to ID token client
                    window.google.accounts.id.initialize({
                      client_id: clientId,
                      callback: async (response) => {
                        try {
                          const base64Url = response.credential.split('.')[1];
                          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                          const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
                          const payload = JSON.parse(jsonPayload);

                          const res = await fetch(`${BACKEND_URL}/api/auth/google`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              email: payload.email,
                              name: payload.name,
                              picture: payload.picture,
                              googleId: payload.sub
                            })
                          });

                          const data = await res.json();
                          if (!res.ok) return resolve({ data: null, error: new Error(data.error || 'Google auth failed') });
                          localStorage.setItem('supabase_session', JSON.stringify(data.session));
                          window.dispatchEvent(new Event('storage'));
                          resolve({ data: { user: data.session.user }, error: null });
                        } catch (e) {
                          resolve({ data: null, error: e });
                        }
                      }
                    });
                    window.google.accounts.id.prompt();
                  }
                } catch (err) {
                  resolve({ data: null, error: err });
                }
              };

              if (window.google?.accounts) {
                startGoogleOAuth();
              } else {
                const script = document.createElement('script');
                script.src = 'https://accounts.google.com/gsi/client';
                script.async = true;
                script.onload = () => startGoogleOAuth();
                document.head.appendChild(script);
              }
            });
          }

          // If no Client ID set yet, prompt user for Client ID or custom Google Email
          if (typeof window !== 'undefined') {
            const userEntered = window.prompt(
              'Google OAuth Setup:\nOption A: Enter your Google Client ID (e.g. 123456789-xxxx.apps.googleusercontent.com)\nOption B: Enter your Google Email to sign in (e.g. your-email@gmail.com)\nClick Cancel for default guest login:'
            );
            
            if (userEntered && userEntered.trim()) {
              const input = userEntered.trim();
              if (input.includes('googleusercontent.com')) {
                localStorage.setItem('google_client_id', input);
                return supabaseClient.auth.signInWithOAuth({ provider });
              } else if (input.includes('@')) {
                const name = input.split('@')[0];
                const res = await fetch(`${BACKEND_URL}/api/auth/google`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: input, name })
                });
                const data = await res.json();
                if (res.ok) {
                  localStorage.setItem('supabase_session', JSON.stringify(data.session));
                  window.dispatchEvent(new Event('storage'));
                  return { data: { user: data.session.user }, error: null };
                }
              }
            }
          }

          // Default fallback guest login
          const email = `google_${provider}_guest@example.com`;
          const name = `Google Guest`;
          
          let res = await fetch(`${BACKEND_URL}/api/auth/signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: 'google_oauth_bypass' })
          });
          
          if (!res.ok) {
            res = await fetch(`${BACKEND_URL}/api/auth/signup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password: 'google_oauth_bypass', name })
            });
          }
          
          const data = await res.json();
          if (!res.ok) {
            return { data: null, error: new Error(data.error || 'OAuth mock failed') };
          }
          localStorage.setItem('supabase_session', JSON.stringify(data.session));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('storage'));
          }
          return { data: { user: data.session.user }, error: null };
        } catch (err) {
          return { data: null, error: err };
        }
      }
    },
    from: (table) => {
      class QueryBuilder {
        constructor(table) {
          this.table = table;
          this.action = 'select';
          this.columns = '*';
          this.filters = [];
          this.insertedData = null;
          this.isSingle = false;
          this.isMaybeSingle = false;
          this.orderCol = null;
          this.orderAscending = false;
        }
        select(columns = '*') {
          if (this.action !== 'insert' && this.action !== 'update' && this.action !== 'delete') {
            this.action = 'select';
          }
          this.columns = columns;
          return this;
        }
        insert(data) {
          this.action = 'insert';
          this.insertedData = data;
          return this;
        }
        update(data) {
          this.action = 'update';
          this.insertedData = data;
          return this;
        }
        delete() {
          this.action = 'delete';
          return this;
        }
        eq(column, value) {
          this.filters.push({ type: 'eq', column, value });
          return this;
        }
        in(column, values) {
          this.filters.push({ type: 'in', column, value: values });
          return this;
        }
        order(column, { ascending = true } = {}) {
          this.orderCol = column;
          this.orderAscending = ascending;
          return this;
        }
        single() {
          this.isSingle = true;
          return this;
        }
        maybeSingle() {
          this.isMaybeSingle = true;
          return this;
        }
        async then(onfulfilled, onrejected) {
          try {
            const sessionStr = localStorage.getItem('supabase_session');
            const session = sessionStr ? JSON.parse(sessionStr) : null;
            const headers = { 'Content-Type': 'application/json' };
            if (session?.access_token) {
              headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            const res = await fetch(`${BACKEND_URL}/api/supabase-query`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                table: this.table,
                action: this.action,
                columns: this.columns,
                filters: this.filters,
                insertedData: this.insertedData,
                isSingle: this.isSingle,
                isMaybeSingle: this.isMaybeSingle,
                orderCol: this.orderCol,
                orderAscending: this.orderAscending,
              })
            });
            const data = await res.json();
            if (!res.ok) {
              const errObj = new Error(data.error || 'Query failed');
              if (onfulfilled) return onfulfilled({ data: null, error: errObj });
              return { data: null, error: errObj };
            }
            if (onfulfilled) return onfulfilled({ data: data.data, error: null });
            return { data: data.data, error: null };
          } catch (err) {
            if (onfulfilled) return onfulfilled({ data: null, error: err });
            return { data: null, error: err };
          }
        }
      }
      return new QueryBuilder(table);
    },
    channel: (chan) => {
      return {
        on: function(event, filter, callback) {
          this.callback = callback;
          this.filter = filter;
          return this;
        },
        subscribe: function() {
          if (chan.startsWith('chat_')) {
            const expenseId = chan.replace('chat_', '');
            this.intervalId = setInterval(async () => {
              try {
                const res = await fetch(`${BACKEND_URL}/api/chat/expense/${expenseId}`);
                if (res.ok) {
                  const chats = await res.json();
                  if (chats && chats.length > 0) {
                    const lastMsg = chats[chats.length - 1];
                    if (!this.lastTriggeredTime || new Date(lastMsg.created_at) > new Date(this.lastTriggeredTime)) {
                      this.lastTriggeredTime = lastMsg.created_at;
                      if (this.callback) {
                        this.callback({
                          new: {
                            id: lastMsg.id,
                            expense_id: lastMsg.expense_id,
                            user_id: lastMsg.user_id,
                            message: lastMsg.message,
                            created_at: lastMsg.created_at
                          }
                        });
                      }
                    }
                  }
                }
              } catch (e) {}
            }, 3000);
          }
          return this;
        }
      };
    },
    removeChannel: (channel) => {
      if (channel && channel.intervalId) {
        clearInterval(channel.intervalId);
      }
    }
  };
}

export const supabase = supabaseClient;
