const crypto = require('crypto');
const localDb = require('../localDb');

const signup = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const db = localDb.readDb();
    let user = db.users.find(u => u.email === email.trim().toLowerCase());
    if (user) {
      return res.status(400).json({ error: 'User already exists' });
    }

    user = {
      id: crypto.randomUUID(),
      email: email.trim().toLowerCase(),
      name: name || email.split('@')[0],
      password: password || 'password',
      created_at: new Date().toISOString()
    };

    db.users.push(user);
    localDb.writeDb(db);

    const token = `mock-token-${user.id}`;
    const session = {
      access_token: token,
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: `mock-refresh-${user.id}`,
      user: {
        id: user.id,
        email: user.email,
        user_metadata: { name: user.name }
      }
    };

    res.status(201).json({ session });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
};

const signin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const db = localDb.readDb();
    let user = db.users.find(u => u.email === email.trim().toLowerCase());
    
    if (!user) {
      // Auto-create user for seamless local development
      user = {
        id: crypto.randomUUID(),
        email: email.trim().toLowerCase(),
        name: email.split('@')[0],
        password: password || 'password',
        created_at: new Date().toISOString()
      };
      db.users.push(user);
      localDb.writeDb(db);
    } else if (user.password && password && password !== user.password && password !== 'google_oauth_bypass') {
      user.password = password;
      localDb.writeDb(db);
    }

    const token = `mock-token-${user.id}`;
    const session = {
      access_token: token,
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: `mock-refresh-${user.id}`,
      user: {
        id: user.id,
        email: user.email,
        user_metadata: { name: user.name }
      }
    };

    res.status(200).json({ session });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: error.message });
  }
};

const googleAuth = async (req, res) => {
  try {
    const { email, name, picture, googleId } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required for Google OAuth' });
    }

    const db = localDb.readDb();
    let user = db.users.find(u => u.email === email.trim().toLowerCase());

    if (!user) {
      user = {
        id: googleId ? `google-${googleId}` : crypto.randomUUID(),
        email: email.trim().toLowerCase(),
        name: name || email.split('@')[0],
        avatar_url: picture || null,
        created_at: new Date().toISOString()
      };
      db.users.push(user);
    } else {
      if (name) user.name = name;
      if (picture) user.avatar_url = picture;
    }

    localDb.writeDb(db);

    const token = `mock-token-${user.id}`;
    const session = {
      access_token: token,
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: `mock-refresh-${user.id}`,
      user: {
        id: user.id,
        email: user.email,
        user_metadata: {
          name: user.name,
          full_name: user.name,
          avatar_url: user.avatar_url || picture
        }
      }
    };

    res.status(200).json({ session });
  } catch (error) {
    console.error('Google Auth error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  signup,
  signin,
  googleAuth
};
