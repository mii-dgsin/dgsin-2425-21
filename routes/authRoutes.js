// routes/authRoutes.js

const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');

const router = express.Router();
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'No_se_me_ocurre_nada';

// Helper para generar JWT incluyendo el role
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

// POST /api/v1/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  }

  try {
    const usersColl = req.app.locals.usersCollection;
    const existing = await usersColl.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Ese email ya está registrado.' });
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Asignamos role 'user' por defecto al registrarse
    const newUser = {
      username,
      email,
      passwordHash: hash,
      role: 'user',       // <--- rol por defecto
      createdAt: new Date()
    };

    await usersColl.insertOne(newUser);
    return res.status(201).json({ message: 'Usuario registrado correctamente.' });
  } catch (err) {
    console.error('Error en /register:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña obligatorios.' });
  }

  try {
    const usersColl = req.app.locals.usersCollection;
    const user = await usersColl.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    // El payload ahora incluye el role
    const payload = {
      userId: user._id.toString(),
      email:  user.email,
      role:   user.role         // <--- almacenamos el rol en el JWT
    };
    const token = generateToken(payload);

    return res.json({
      token, 
      expiresIn: 3600,
      username: user.username,
      email: user.email,
      role: user.role           // <--- devolvemos el rol al front también
    });
  } catch (err) {
    console.error('Error en /login:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;
