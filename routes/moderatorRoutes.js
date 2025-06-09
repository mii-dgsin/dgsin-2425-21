// routes/moderatorRoutes.js

const express = require('express');
const { ObjectId } = require('mongodb');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

const router = express.Router();

/*
  Supondremos que en MongoDB existe la colección "reports" con este esquema mínimo:
  {
    _id,
    reporterId,         // quién reportó
    reportedId,         // id del usuario o del contenido reportado
    type: 'post'|'comment',
    reason,             // texto que explica por qué se reportó
    createdAt,          // fecha de creación del reporte
    status: 'pending'|'resolved', 
    // resolvedBy, resolvedAt, actionTaken, etc.
  }
*/

// 1) LISTAR TODOS LOS REPORTES
// GET /api/v1/mod/reports
router.get(
  '/reports',
  verifyToken,
  checkRole(['admin', 'moderator', 'user']),
  async (req, res) => {
    try {
      const reportsColl = req.app.locals.reportsCollection;

      // ✅ Traer todos los reportes, no solo los pendientes
      const allReports = await reportsColl
        .find()
        .sort({ createdAt: -1 })
        .toArray();

      return res.json(allReports);
    } catch (err) {
      console.error('Error al listar reports:', err);
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }
  }
);

// 2) TOMAR ACCIÓN SOBRE UN REPORTE
// PATCH /api/v1/mod/reports/:id
router.patch(
  '/reports/:id',
  verifyToken,
  checkRole(['admin', 'moderator']),
  async (req, res) => {
    const { id } = req.params;
    const { action } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de reporte inválido.' });
    }

    const validStates = [
      'pending', 'investigating', 'resolved', 'wontfix', 'duplicate', 'invalid', 'needsReview'
    ];

    if (!action || !validStates.includes(action)) {
      return res.status(400).json({ error: 'Estado de bug no válido o no especificado.' });
    }

    try {
      const reportsColl = req.app.locals.reportsCollection;
      const report = await reportsColl.findOne({ _id: new ObjectId(id) });

      if (!report) {
        return res.status(404).json({ error: 'Reporte no encontrado.' });
      }

      await reportsColl.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status: action,
            resolvedBy: req.user.userId,
            resolvedAt: new Date()
          }
        }
      );

      return res.json({ message: 'Estado actualizado correctamente.' });
    } catch (err) {
      console.error('Error al procesar reporte:', err);
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }
  }
);

module.exports = router;
