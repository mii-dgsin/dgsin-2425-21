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

// 1) LISTAR REPORTES PENDIENTES
// GET /api/v1/mod/reports
router.get(
  '/reports',
  verifyToken,
  checkRole(['admin', 'moderator']),
  async (req, res) => {
    try {
      // 1.a) Obtenemos la colección de reportes directamente desde app.locals
      const reportsColl = req.app.locals.reportsCollection;

      // 1.b) Hacemos la consulta por status = "pending"
      const pending = await reportsColl
        .find({ status: 'pending' })
        .sort({ createdAt: -1 })
        .toArray();

      return res.json(pending);
    } catch (err) {
      console.error('Error al listar reports:', err);
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }
  }
);

// 2) TOMAR ACCIÓN SOBRE UN REPORTE (marcar resuelto / eliminar contenido / suspender usuario)
// PATCH /api/v1/mod/reports/:id
router.patch(
  '/reports/:id',
  verifyToken,
  checkRole(['admin', 'moderator']),
  async (req, res) => {
    const { id } = req.params;
    // En el body vendrán { action: 'resolve'|'deleteContent'|'suspendUser', suspendDays?: number }
    const { action, suspendDays } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de reporte inválido.' });
    }

    try {
      // 2.a) Recojo la colección de reportes
      const reportsColl = req.app.locals.reportsCollection;

      // 2.b) Buscamos el reporte original
      const report = await reportsColl.findOne({ _id: new ObjectId(id) });
      if (!report) {
        return res.status(404).json({ error: 'Reporte no encontrado.' });
      }

      // 2.c) Marcamos el reporte como "resolved" y guardamos quién lo resolvió
      await reportsColl.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status: 'resolved',
            resolvedBy: req.user.userId,
            resolvedAt: new Date(),
            actionTaken: action
          }
        }
      );

      // 2.d) Dependiendo de la acción, hacemos tareas adicionales
      const db = req.app.locals.db;

      if (action === 'deleteContent') {
        // Ejemplo: si report.type === 'post', eliminamos de la colección "posts"
        if (report.type === 'post') {
          const postsColl = db.collection('posts');
          await postsColl.deleteOne({ _id: new ObjectId(report.reportedId) });
        } else if (report.type === 'comment') {
          const commentsColl = db.collection('comments');
          await commentsColl.deleteOne({ _id: new ObjectId(report.reportedId) });
        }
      } else if (action === 'suspendUser') {
        // Suspender al usuario reportado por "suspendDays" días
        const usersColl = req.app.locals.usersCollection;
        const untilDate = new Date(Date.now() + suspendDays * 24 * 60 * 60 * 1000);
        await usersColl.updateOne(
          { _id: new ObjectId(report.reportedId) },
          { $set: { suspendedUntil: untilDate } }
        );
      }

      return res.json({ message: 'Reporte procesado correctamente.' });
    } catch (err) {
      console.error('Error al procesar reporte:', err);
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }
  }
);

module.exports = router;
