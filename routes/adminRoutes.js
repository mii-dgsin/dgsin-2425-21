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
// 3) CARGAR DATOS INICIALES DE REPORTES
// GET /api/v1/admin/loadInitialData
router.get(
  '/loadInitialData',
  verifyToken,
  checkRole(['admin']),
  async (req, res) => {
    try {
      const reportsColl = req.app.locals.reportsCollection;
      const existingCount = await reportsColl.countDocuments();

      if (existingCount > 0) {
        return res.status(200).json({ message: 'Ya existen datos en la colección.' });
      }

      const sampleReports = [
        {
          reporterId: 'user',
          title: 'Error en botón de envío',
          description: 'El botón de enviar no funciona en Firefox.',
          type: 'bug',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          reporterId: 'user',
          title: 'Sugerencia de nueva funcionalidad',
          description: 'Agregar modo oscuro a la interfaz.',
          type: 'feature',
          status: 'needsReview',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          reporterId: 'user',
          title: 'Problema de visualización',
          description: 'El logo se ve borroso en pantallas Retina.',
          type: 'bug',
          status: 'investigating',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          reporterId: 'mod',
          title: 'Error 500 al enviar formulario',
          description: 'Se recibe un error del servidor al crear un reporte.',
          type: 'bug',
          status: 'resolved',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          reporterId: 'mod',
          title: 'Funcionalidad duplicada',
          description: 'El panel de usuario repite opciones.',
          type: 'bug',
          status: 'duplicate',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      await reportsColl.insertMany(sampleReports);
      return res.status(201).json({ message: 'Datos de prueba insertados correctamente.' });

    } catch (err) {
      console.error('Error en loadInitialData:', err);
      return res.status(500).json({ error: 'Error interno al cargar datos iniciales.' });
    }
  }
);

module.exports = router;
