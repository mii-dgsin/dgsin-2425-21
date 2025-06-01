// routes/adminRoutes.js

const express = require('express');
const { ObjectId } = require('mongodb');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

const router = express.Router();

//
// 1) LISTAR TODOS LOS USUARIOS
// GET /api/v1/admin/users
router.get(
  '/users',
  verifyToken,
  checkRole(['admin']),
  async (req, res) => {
    try {
      const usersColl = req.app.locals.usersCollection;
      // Devolver solo campos públicos, no el passwordHash
      const users = await usersColl
        .find({}, { projection: { passwordHash: 0 } })
        .sort({ createdAt: -1 })
        .toArray();
      return res.json(users);
    } catch (err) {
      console.error('Error al listar usuarios:', err);
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }
  }
);

//
// 2) CAMBIAR EL ROL DE UN USUARIO
// PATCH /api/v1/admin/users/:id/role
router.patch(
  '/users/:id/role',
  verifyToken,
  checkRole(['admin']),
  async (req, res) => {
    const { id } = req.params;
    const { role } = req.body; // 'user' | 'moderator' | 'admin'
    if (!['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Rol inválido.' });
    }

    try {
      const usersColl = req.app.locals.usersCollection;
      const result = await usersColl.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role } }
      );
      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }
      return res.json({ message: 'Rol actualizado correctamente.' });
    } catch (err) {
      console.error('Error al cambiar rol:', err);
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }
  }
);

//
// 3) (Opcional) Configuraciones Globales
// GET /api/v1/admin/config
// PATCH /api/v1/admin/config
// … tu lógica aquí …

module.exports = router;
