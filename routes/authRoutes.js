// routes/authRoutes.js

const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');

const router = express.Router();
const SALT_ROUNDS = 10;

// Obtenemos el secreto de las variables de entorno.
// Si no existe, lo dejamos en `null` para lanzar error más adelante.
const JWT_SECRET = process.env.JWT_SECRET || null;

// Función helper para generar un JWT con payload y expiración
function generateToken(payload) {
  if (!JWT_SECRET) {
    // Si no hay un JWT_SECRET definido, lanzamos una excepción
    throw new Error('No se encontró la variable de entorno JWT_SECRET');
  }
  // Firmamos el token con el secreto y expiración de 1h (3600 s)
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

/**
 * POST /api/v1/auth/register
 * Registra a un usuario nuevo con rol "user" por defecto.
 */
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  // Validaciones básicas de campos
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: username, email o password.' });
  }

  try {
    // Obtenemos la colección de usuarios desde app.locals
    const usersColl = req.app.locals.usersCollection;
    if (!usersColl) {
      console.error('📂 Colección "usersCollection" no encontrada en app.locals');
      return res.status(500).json({ error: 'Error interno: colección de usuarios no inicializada.' });
    }

    // Comprobamos si ya existe un usuario con ese email
    const existingUser = await usersColl.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Ese email ya está registrado.' });
    }

    // Hasheamos la contraseña
    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Creamos el objeto usuario con rol "user" por defecto
    const newUser = {
      username,
      email,
      passwordHash: hash,
      role: 'user',         // Rol por defecto al registrarse
      createdAt: new Date()
    };

    // Insertamos en la base de datos
    await usersColl.insertOne(newUser);

    return res.status(201).json({ message: 'Usuario registrado correctamente.' });
  } catch (err) {
    console.error('Error en /register:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

/**
 * POST /api/v1/auth/login
 * Autentica a un usuario existente y devuelve un JWT con su rol.
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Validaciones básicas de campos
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password son obligatorios.' });
  }

  try {
    // Obtenemos la colección de usuarios desde app.locals
    const usersColl = req.app.locals.usersCollection;
    if (!usersColl) {
      console.error('📂 Colección "usersCollection" no encontrada en app.locals');
      return res.status(500).json({ error: 'Error interno: colección de usuarios no inicializada.' });
    }

    // Buscamos al usuario por email
    const user = await usersColl.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    // Comparamos la contraseña recibida con el hash almacenado
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    // Preparamos el payload del JWT incluyendo el rol
    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role        // Muy importante: incluimos el rol
    };

    let token;
    try {
      token = generateToken(payload);
    } catch (e) {
      console.error('Error generando JWT:', e);
      return res.status(500).json({ error: 'Error generando token.' });
    }

    // Devolvemos el token y la información básica del usuario
    return res.json({
      token,
      expiresIn: 3600,      // 1 hora en segundos
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role       // También devolvemos el rol al frontend
    });
  } catch (err) {
    console.error('Error en /login:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;
