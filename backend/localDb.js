const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'mock_db.json');

function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const initialDb = {
        users: [
          {
            id: "11111111-1111-1111-1111-111111111111",
            name: "Guest User",
            email: "guest@example.com"
          },
          {
            id: "22222222-2222-2222-2222-222222222222",
            name: "Aisha",
            email: "aisha@example.com"
          },
          {
            id: "33333333-3333-3333-3333-333333333333",
            name: "Rohan",
            email: "rohan@example.com"
          },
          {
            id: "44444444-4444-4444-4444-444444444444",
            name: "Priya",
            email: "priya@example.com"
          }
        ],
        groups: [],
        group_members: [],
        expenses: [],
        expense_splits: [],
        settlements: [],
        chat_messages: []
      };
      writeDb(initialDb);
      return initialDb;
    }
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to read local DB, fallback to empty:', e);
    return {
      users: [],
      groups: [],
      group_members: [],
      expenses: [],
      expense_splits: [],
      settlements: [],
      chat_messages: []
    };
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write local DB:', e);
  }
}

async function executeQuery({
  table,
  action,
  columns,
  filters = [],
  insertedData = null,
  isSingle = false,
  isMaybeSingle = false,
  orderCol = null,
  orderAscending = false
}) {
  const db = readDb();
  if (!db[table]) {
    db[table] = [];
  }
  let data = db[table];

  if (action === 'select') {
    // Apply filters
    for (const filter of filters) {
      const { type, column, value } = filter;
      if (type === 'eq') {
        data = data.filter(row => String(row[column]) === String(value));
      } else if (type === 'in') {
        const valSet = new Set(value.map(String));
        data = data.filter(row => valSet.has(String(row[column])));
      }
    }

    // Apply sorting
    if (orderCol) {
      data = [...data].sort((a, b) => {
        const valA = a[orderCol];
        const valB = b[orderCol];
        if (valA === undefined || valB === undefined) return 0;
        if (typeof valA === 'string') {
          return orderAscending ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return orderAscending ? valA - valB : valB - valA;
      });
    }

    // Resolve Joins (Nested Selects)
    const resolvedData = data.map(row => {
      const newRow = { ...row };
      
      // 1. Join for users: "user:users(id, name, email)" in expense_splits
      if (table === 'expense_splits') {
        const userRow = db.users.find(u => String(u.id) === String(row.user_id));
        newRow.user = userRow ? { id: userRow.id, name: userRow.name, email: userRow.email } : null;
      }
      
      // 2. Joins in group_members: groups(id, name, created_at) and users(id, email, name)
      if (table === 'group_members') {
        const groupRow = db.groups.find(g => String(g.id) === String(row.group_id));
        newRow.groups = groupRow ? { id: groupRow.id, name: groupRow.name, created_at: groupRow.created_at } : null;
        
        const userRow = db.users.find(u => String(u.id) === String(row.user_id));
        newRow.users = userRow ? { id: userRow.id, name: userRow.name, email: userRow.email } : null;
      }

      // 3. Join for payer in expenses: payer:users!expenses_paid_by_fkey (id, name, email)
      if (table === 'expenses') {
        const userRow = db.users.find(u => String(u.id) === String(row.paid_by));
        newRow.payer = userRow ? { id: userRow.id, name: userRow.name, email: userRow.email } : null;
      }

      // 4. Join for payer/payee in settlements
      if (table === 'settlements') {
        const payerRow = db.users.find(u => String(u.id) === String(row.payer_id));
        newRow.payer = payerRow ? { id: payerRow.id, name: payerRow.name, email: payerRow.email } : null;

        const payeeRow = db.users.find(u => String(u.id) === String(row.payee_id));
        newRow.payee = payeeRow ? { id: payeeRow.id, name: payeeRow.name, email: payeeRow.email } : null;
      }

      // 5. Join for user in chat_messages
      if (table === 'chat_messages') {
        const userRow = db.users.find(u => String(u.id) === String(row.user_id));
        newRow.user = userRow ? { id: userRow.id, name: userRow.name, email: userRow.email } : null;
      }

      return newRow;
    });

    if (isSingle || isMaybeSingle) {
      return resolvedData.length > 0 ? resolvedData[0] : null;
    }
    return resolvedData;

  } else if (action === 'insert') {
    const rows = Array.isArray(insertedData) ? insertedData : [insertedData];
    const newRows = rows.map(row => {
      const newRow = { ...row };
      if (!newRow.id) {
        newRow.id = crypto.randomUUID();
      }
      if (!newRow.created_at && ['groups', 'expenses', 'settlements', 'chat_messages', 'users'].includes(table)) {
        newRow.created_at = new Date().toISOString();
      }
      // Ensure specific fields are correctly formatted (numeric etc)
      if (table === 'expenses' && newRow.amount !== undefined) {
        newRow.amount = parseFloat(newRow.amount);
      }
      if (table === 'expense_splits' && newRow.amount !== undefined) {
        newRow.amount = parseFloat(newRow.amount);
      }
      if (table === 'settlements' && newRow.amount !== undefined) {
        newRow.amount = parseFloat(newRow.amount);
      }
      
      db[table].push(newRow);
      return newRow;
    });
    
    writeDb(db);
    return isSingle || isMaybeSingle ? newRows[0] : newRows;

  } else if (action === 'update') {
    let updatedCount = 0;
    db[table] = db[table].map(row => {
      let matches = true;
      for (const filter of filters) {
        if (filter.type === 'eq' && String(row[filter.column]) !== String(filter.value)) {
          matches = false;
        }
      }
      if (matches) {
        updatedCount++;
        return { ...row, ...insertedData };
      }
      return row;
    });

    if (updatedCount > 0) {
      writeDb(db);
    }
    
    let updatedRows = db[table];
    for (const filter of filters) {
      if (filter.type === 'eq') {
        updatedRows = updatedRows.filter(row => String(row[filter.column]) === String(filter.value));
      }
    }
    return isSingle || isMaybeSingle ? updatedRows[0] : updatedRows;

  } else if (action === 'delete') {
    const originalLength = db[table].length;
    const deleteMatches = (row) => {
      let matches = true;
      for (const filter of filters) {
        if (filter.type === 'eq' && String(row[filter.column]) !== String(filter.value)) {
          matches = false;
        }
      }
      return matches;
    };

    db[table] = db[table].filter(row => !deleteMatches(row));
    if (db[table].length !== originalLength) {
      writeDb(db);
    }
    return null;
  }
  return null;
}

module.exports = {
  readDb,
  writeDb,
  executeQuery
};
