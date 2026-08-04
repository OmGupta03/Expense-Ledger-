const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const localDb = require('../localDb');

const useLocalDb = !process.env.SUPABASE_URL || 
                    process.env.SUPABASE_URL.includes('placeholder') || 
                    process.env.USE_LOCAL_DB === 'true';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'placeholder';

if (!useLocalDb && (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY)) {
  console.error('CRITICAL: SUPABASE_URL and SUPABASE_ANON_KEY must be set in the environment');
  process.exit(1);
}

function createLocalClient(token) {
  let authUserId = null;
  if (token && token.startsWith('mock-token-')) {
    authUserId = token.replace('mock-token-', '');
  }

  class LocalQueryBuilder {
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
        const data = await localDb.executeQuery({
          table: this.table,
          action: this.action,
          columns: this.columns,
          filters: this.filters,
          insertedData: this.insertedData,
          isSingle: this.isSingle,
          isMaybeSingle: this.isMaybeSingle,
          orderCol: this.orderCol,
          orderAscending: this.orderAscending
        });
        if (onfulfilled) return onfulfilled({ data, error: null });
        return { data, error: null };
      } catch (err) {
        if (onrejected) return onrejected({ data: null, error: err });
        return { data: null, error: err };
      }
    }
  }

  return {
    from: (table) => new LocalQueryBuilder(table)
  };
}

const supabaseDefault = useLocalDb ? createLocalClient() : createClient(supabaseUrl, supabaseAnonKey);

function getClient(req) {
  const authHeader = req.headers ? req.headers.authorization : null;
  const token = authHeader && authHeader.split(' ')[1];
  if (useLocalDb) {
    return createLocalClient(token);
  }
  if (token) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
  }
  return supabaseDefault;
}

module.exports = {
  getClient,
  useLocalDb,
  supabaseDefault,
  createLocalClient
};
