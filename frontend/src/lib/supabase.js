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
          const email = `google_${provider}_guest@example.com`;
          const name = `Google Guest`;
          
          // Try to sign in first
          let res = await fetch(`${BACKEND_URL}/api/auth/signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: 'google_oauth_bypass' })
          });
          
          if (!res.ok) {
            // If sign in fails (e.g. user does not exist), try signing up
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
