// routes/reportRoutes.js
const express = require('express');
const { ObjectId } = require('mongodb');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

const router = express.Router();

//
// GET /api/v1/reports/loadInitialData
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

/**
 * GET /api/v1/reports/docs
 * Accede a la documetnación de postman de los reportes
 */
router.get(
  '/docs',
  (req, res) => {
    const docsUrl =
      'https://documenter.getpostman.com/view/15292272/2sB2x8Dqsv'; 
    return res.redirect(docsUrl);
  }
);

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
