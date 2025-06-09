// routes/reportRoutes.js
const express = require('express');
const { ObjectId } = require('mongodb');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * POST /api/v1/reports
 * Crear un nuevo reporte de bug
 */
router.post('/', verifyToken, async (req, res) => {
  const { title, description, type } = req.body;

  if (!title || !description || !type) {
    return res.status(400).json({ error: 'Faltan campos: title, description o type.' });
  }

  const newReport = {
    reporterId: new ObjectId(req.user.userId),
    title,
    description,
    type,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  try {
    const reportsColl = req.app.locals.reportsCollection;
    const existing = await reportsColl.findOne({ title });
    if (existing) {
      return res.status(409).json({ error: 'Ya existe un reporte con este título.' });
    }
    const result = await reportsColl.insertOne(newReport);
    res.status(201).json({ message: 'Reporte creado', id: result.insertedId });
  } catch (err) {
    console.error('Error creando reporte:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

/**
 * GET /api/v1/reports
 * Listar todos los reportes
 */
router.get('/', async (req, res) => {
  try {
    const reportsColl = req.app.locals.reportsCollection;
    const reports = await reportsColl
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    res.json(reports);
  } catch (err) {
    console.error('Error al listar reportes:', err);
    res.status(500).json({ error: 'Error interno.' });
  }
});

/**
 * GET /api/v1/reports/:id
 * Obtener un reporte por ID
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'ID inválido' });

  try {
    const reportsColl = req.app.locals.reportsCollection;
    const report = await reportsColl.findOne({ _id: new ObjectId(id) });
    if (!report) return res.status(404).json({ error: 'Reporte no encontrado' });
    res.json(report);
  } catch (err) {
    console.error('Error al obtener reporte:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

/**
 * PUT /api/v1/reports/:id
 * Editar un reporte
 */
router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { title, description, type } = req.body;

  if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'ID inválido' });

  if (req.body._id && req.body._id !== id) {
    return res.status(400).json({ error: 'Conflicto: el ID en el cuerpo no coincide con el ID de la URL.' });
  }

  try {
    const reportsColl = req.app.locals.reportsCollection;
    const report = await reportsColl.findOne({ _id: new ObjectId(id) });

    if (!report) return res.status(404).json({ error: 'Reporte no encontrado' });

    // Validar acceso
    const isOwner = report.reporterId.toString() === req.user.userId;
    const isPrivileged = ['admin', 'moderator'].includes(req.user.role);
    if (!isOwner && !isPrivileged) {
      return res.status(403).json({ error: 'Sin permiso para editar este reporte.' });
    }

    await reportsColl.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          title,
          description,
          type,
          updatedAt: new Date()
        }
      }
    );

    res.json({ message: 'Reporte actualizado.' });
  } catch (err) {
    console.error('Error actualizando reporte:', err);
    res.status(500).json({ error: 'Error interno.' });
  }
});

/**
 * DELETE /api/v1/reports/:id
 * Eliminar un reporte
 */
router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'ID inválido' });

  try {
    const reportsColl = req.app.locals.reportsCollection;
    const report = await reportsColl.findOne({ _id: new ObjectId(id) });

    if (!report) return res.status(404).json({ error: 'Reporte no encontrado' });

    // Validar acceso
    const isOwner = report.reporterId.toString() === req.user.userId;
    const isPrivileged = ['admin', 'moderator'].includes(req.user.role);
    if (!isOwner && !isPrivileged) {
      return res.status(403).json({ error: 'Sin permiso para eliminar este reporte.' });
    }

    await reportsColl.deleteOne({ _id: new ObjectId(id) });

    res.json({ message: 'Reporte eliminado.' });
  } catch (err) {
    console.error('Error al eliminar reporte:', err);
    res.status(500).json({ error: 'Error interno.' });
  }
});

/**
 * DELETE /api/v1/reports
 * Elimina todos los reportes (solo admin)
 */
router.delete('/', verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const reportsColl = req.app.locals.reportsCollection;
    const result = await reportsColl.deleteMany({});
    res.json({ message: `Se eliminaron ${result.deletedCount} reportes.` });
  } catch (err) {
    console.error('Error al borrar todos los reportes:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});


module.exports = router;
