// routes/authRoutes.js

const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');

const router = express.Router();
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'cambiame_por_un_secreto_muy_seguro';

// Helper para generar JWT
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

    // Verificar si ya existe ese email
    const existing = await usersColl.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Ese email ya está registrado.' });
    }

    // Hashear la contraseña
    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Crear documento de usuario
    const newUser = {
      username,
      email,
      passwordHash: hash,
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
      // No existe ese email
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    // Verificar contraseña
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    // Generar JWT con payload mínimo (puedes añadir más claims si quieres)
    const payload = {
      userId: user._id.toString(),
      email: user.email
    };
    const token = generateToken(payload);

    return res.json({
      token,
      expiresIn: 3600,          // segs
      username: user.username,
      email: user.email
    });
  } catch (err) {
    console.error('Error en /login:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;
