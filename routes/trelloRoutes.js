// routes/trelloRoutes.js

const express = require('express');
const router = express.Router();
const { getTrelloStats } = require('../scrape/trelloScraper');

// GET /api/v1/trello-stats
// Lee del documento 'dailyStats' en la colección y devuelve { stats, updatedAt }
router.get('/trello-stats', async (req, res) => {
  try {
    const collection = req.app.locals.statsCollection;
    const doc = await collection.findOne(
      { _id: 'dailyStats' },
      { projection: { _id: 0, data: 1, updatedAt: 1 } }
    );
    if (!doc) {
      return res.status(404).json({ error: 'No stats available' });
    }
    res.json({ stats: doc.data, updatedAt: doc.updatedAt });
  } catch (err) {
    console.error('❌ DB read error:', err);
    res.status(500).json({ error: 'DB read failed' });
  }
});

// POST /api/v1/trello-stats/update
// Ejecuta el scraper, guarda/actualiza el resultado en MongoDB y lo devuelve
router.post('/trello-stats/update', async (req, res) => {
  try {
    const stats = await getTrelloStats();
    const collection = req.app.locals.statsCollection;
    await collection.updateOne(
      { _id: 'dailyStats' },
      { $set: { data: stats, updatedAt: new Date() } },
      { upsert: true }
    );
    res.json({ success: true, stats });
  } catch (err) {
    console.error('❌ Scraper update error:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

module.exports = router;
