// routes/visitorRoutes.js

const express = require('express');
const axios = require('axios');
const router = express.Router();

async function getCountry(ip) {
  try {
    const { data } = await axios.get(`https://ipapi.co/${ip}/json/`);
    return data.country_name || 'Desconocido';
  } catch (err) {
    console.error('Error al obtener país:', err.message);
    return 'Desconocido';
  }
}

router.post('/log-visit', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const coll = db.collection('visitorCountries');

    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    const country = await getCountry(ip);

    await coll.updateOne(
      { country },
      { $inc: { count: 1 } },
      { upsert: true }
    );

    res.json({ message: `Visita registrada: ${country}` });

  } catch (err) {
    console.error('Error registrando visita:', err);
    res.status(500).json({ error: 'Error interno registrando visita.' });
  }
});

module.exports = router;
