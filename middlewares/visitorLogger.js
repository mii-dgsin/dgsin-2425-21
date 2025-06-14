// middlewares/visitorLogger.js

const axios = require('axios');

async function getCountry(ip) {
  try {
    const { data } = await axios.get(`https://ipapi.co/${ip}/json/`);
    return data.country_name || 'Desconocido';
  } catch (err) {
    console.error('Error al obtener país:', err.message);
    return 'Desconocido';
  }
}

async function visitorLogger(req, res, next) {
  try {
    const db = req.app.locals.db;
    const coll = db.collection('visitorCountries');

    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1';
    const country = await getCountry(ip);

    await coll.updateOne(
      { country },
      { $inc: { count: 1 } },
      { upsert: true }
    );

  } catch (err) {
    console.error('Error registrando visitante:', err);
    // Pero siempre continuar:
  }

  next();
}

module.exports = visitorLogger;
