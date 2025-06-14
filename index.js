// index.js

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const { MongoClient } = require('mongodb');
const cron = require('node-cron');

// Rutas
const trelloRoutes = require('./routes/trelloRoutes');
const authRoutes = require('./routes/authRoutes');
const moderatorRoutes = require('./routes/moderatorRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reportRoutes = require('./routes/reportRoutes');
const visitorRoutes = require('./routes/visitorRoutes');

const { getTrelloStats } = require('./scrape/trelloScraper');

const app = express();

// CORS para frontend local y producción
app.use(cors({
  origin: [
    'https://dgsin-2425-21-front.ew.r.appspot.com',
    'http://localhost:4200'
  ],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization']
}));

// JSON + estáticos
app.use(express.json());
app.use('/', express.static(path.join(__dirname, 'public')));

// Las rutas globales para la localización
app.use('/api/v1/visitor', visitorRoutes);

// Las rutas globales de reports
app.use('/api/v1/reports', reportRoutes);

// Función principal de arranque
async function startServer() {
  const client = new MongoClient(process.env.MDB_URL);
  await client.connect();
  const db = client.db();
  app.locals.db = db;

  // Inicializar colecciones:
  // 1️⃣ Trello stats
  const statsColls = await db.listCollections({ name: 'trelloStats' }).toArray();
  if (statsColls.length === 0) await db.createCollection('trelloStats');
  const statsColl = db.collection('trelloStats');
  app.locals.statsCollection = statsColl;

  // 2️⃣ Users
  const usersColls = await db.listCollections({ name: 'users' }).toArray();
  if (usersColls.length === 0) await db.createCollection('users');
  const usersColl = db.collection('users');
  app.locals.usersCollection = usersColl;

  await usersColl.createIndex({ email: 1 }, { unique: true, name: 'idx_unique_email' }).catch(() => {});
  await usersColl.createIndex({ role: 1 }, { name: 'idx_role' }).catch(() => {});

  // 3️⃣ Reports
  const reportsColls = await db.listCollections({ name: 'reports' }).toArray();
  if (reportsColls.length === 0) await db.createCollection('reports');
  const reportsColl = db.collection('reports');
  app.locals.reportsCollection = reportsColl;

  await reportsColl.createIndex({ status: 1, createdAt: -1 }, { name: 'idx_status_createdAt' }).catch(() => {});
  await reportsColl.createIndex({ title: 'text', description: 'text' }, { name: 'idx_text_bugsearch' }).catch(() => {});

  // 4️⃣ Visitor countries
  const visitorCountriesColls = await db.listCollections({ name: 'visitorCountries' }).toArray();
  if (visitorCountriesColls.length === 0) await db.createCollection('visitorCountries');
  const visitorCountriesColl = db.collection('visitorCountries');
  app.locals.visitorCountriesCollection = visitorCountriesColl;

  console.log('✅ MongoDB conectado y colecciones listas.');

  // Cron de actualización de Trello
  cron.schedule('0 2 * * *', async () => {
    try {
      const stats = await getTrelloStats();
      await statsColl.updateOne(
        { _id: 'dailyStats' },
        { $set: { data: stats, updatedAt: new Date() } },
        { upsert: true }
      );
      console.log('✅ Trello stats actualizadas.');
    } catch (err) {
      console.error('❌ Error actualizando Trello stats:', err);
    }
  });

  // Montaje de rutas
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/mod', moderatorRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1', trelloRoutes);

  // Arrancar servidor
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`🚀 Backend escuchando en puerto ${PORT}`);
  }).on('error', (err) => {
    console.error('❌ Error arrancando el servidor:', err);
  });
}

startServer().catch(err => {
  console.error('❌ Fallo al iniciar el servidor:', err);
});
