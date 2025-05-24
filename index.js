// index.js

// 1. Carga .env en desarrollo
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express     = require('express');
const cors        = require('cors');
const path        = require('path');
const { MongoClient } = require('mongodb');
const cron        = require('node-cron');
const trelloRoutes = require('./routes/trelloRoutes');
const { getTrelloStats } = require('./scrape/trelloScraper');

const app = express();

// 2. Middleware CORS (permite peticiones desde tu front desplegado)
app.use(cors({
  origin: [
    'https://dgsin-2425-21-front.ew.r.appspot.com',
    'http://localhost:4200'
  ]
}));

// 3. Middleware JSON + servir estáticos (si tienes public/)
app.use(express.json());
app.use('/', express.static(path.join(__dirname, 'public')));

// 4. Función principal para conectar a Mongo y arrancar el servidor
async function startServer() {
  // Conectar a MongoDB (URL en process.env.MDB_URL)
  const client = new MongoClient(process.env.MDB_URL);
  await client.connect();

  const db = client.db();  
  const statsColl = db.collection('trelloStats');

  // (Opcional) limpia cualquier dato previo
  // await statsColl.deleteMany({});

  app.locals.statsCollection = statsColl;
  console.log('✅ Conectado a MongoDB y colección limpia');

  // 5. Cron diario a las 02:00 para actualizar las estadísticas
  cron.schedule('0 2 * * *', async () => {
    try {
      const stats = await getTrelloStats();
      await statsColl.updateOne(
        { _id: 'dailyStats' },
        { $set: { data: stats, updatedAt: new Date() } },
        { upsert: true }
      );
      console.log('✅ Trello stats actualizadas:', new Date().toISOString());
    } catch (err) {
      console.error('❌ Error en cron de actualización:', err);
    }
  });

  // 6. Montar API versionada
  app.use('/api/v1', trelloRoutes);

  // 7. Levantar el servidor
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`🚀 Server listo en puerto ${PORT}`);
  }).on('error', err => {
    console.error('❌ Error arrancando el servidor:', err);
  });
}

// 8. Iniciar todo
startServer().catch(err => {
  console.error('❌ No se pudo iniciar el servidor:', err);
});
