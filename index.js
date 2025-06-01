// index.js

// 1. Carga .env en desarrollo
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express         = require('express');
const cors            = require('cors');
const path            = require('path');
const { MongoClient } = require('mongodb');
const cron            = require('node-cron');

// Importar rutas
const trelloRoutes      = require('./routes/trelloRoutes');
const authRoutes        = require('./routes/authRoutes');
const moderatorRoutes   = require('./routes/moderatorRoutes');
const adminRoutes       = require('./routes/adminRoutes');

const { getTrelloStats } = require('./scrape/trelloScraper');

const app = express();

// 2. Middleware CORS (permitir front en local y producción)
app.use(
  cors({
    origin: [
      'https://dgsin-2425-21-front.ew.r.appspot.com',
      'http://localhost:4200'
    ],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Authorization']
  })
);

// 3. Middleware JSON + servir estáticos (si usas carpeta "public/")
app.use(express.json());
app.use('/', express.static(path.join(__dirname, 'public')));

// 4. Función principal para conectar a Mongo y arrancar el servidor
async function startServer() {
  // 4.1 Conexión a MongoDB (sin las opciones deprecadas)
  const client = new MongoClient(process.env.MDB_URL);
  await client.connect();
  const db = client.db(); // La base de datos que viene en la URL

  // Guardamos la referencia a "db" en app.locals para que esté disponible en req.app.locals.db
  app.locals.db = db;

  // 4.2 Inicializar la colección "trelloStats"
  const statsColls = await db.listCollections({ name: 'trelloStats' }).toArray();
  if (statsColls.length === 0) {
    await db.createCollection('trelloStats');
    console.log('✅ Colección "trelloStats" creada.');
  }
  const statsColl = db.collection('trelloStats');
  app.locals.statsCollection = statsColl;

  // 4.3 Inicializar la colección "users"
  const usersColls = await db.listCollections({ name: 'users' }).toArray();
  if (usersColls.length === 0) {
    await db.createCollection('users');
    console.log('✅ Colección "users" creada.');
  }
  const usersColl = db.collection('users');

  // Intentamos crear índice único en email, pero si ya existe, lo ignoramos:
  try {
    await usersColl.createIndex(
      { email: 1 },
      { unique: true, name: 'idx_unique_email' }
    );
    console.log('✅ Índice único "idx_unique_email" creado en "users(email)".');
  } catch (err) {
    if (err.codeName === 'IndexOptionsConflict' || err.code === 85) {
      console.log('ℹ️ El índice "email_1" ya existe en "users". Se omite creación.');
    } else {
      console.error('❌ Error inesperado al crear índice en users(email):', err);
      throw err; // Salir si es otro tipo de error
    }
  }

  // Intentamos crear índice en role, si no existe:
  try {
    await usersColl.createIndex(
      { role: 1 },
      { name: 'idx_role' }
    );
    console.log('✅ Índice "idx_role" creado en "users(role)".');
  } catch (err) {
    if (err.codeName === 'IndexOptionsConflict' || err.code === 85) {
      console.log('ℹ️ El índice "role_1" ya existe en "users". Se omite creación.');
    } else {
      console.error('❌ Error inesperado al crear índice en users(role):', err);
      throw err;
    }
  }

  app.locals.usersCollection = usersColl;

  // 4.4 Inicializar la colección "reports"
  const reportsColls = await db.listCollections({ name: 'reports' }).toArray();
  if (reportsColls.length === 0) {
    await db.createCollection('reports');
    console.log('✅ Colección "reports" creada.');

    // Crear índice compuesto sobre status y createdAt:
    await db.collection('reports').createIndex(
      { status: 1, createdAt: -1 },
      { name: 'idx_status_createdAt' }
    );
    console.log('✅ Índice "idx_status_createdAt" creado en "reports(status, createdAt)".');
  }
  const reportsColl = db.collection('reports');
  app.locals.reportsCollection = reportsColl;

  console.log('✅ Conectado a MongoDB y colecciones inicializadas.');

  // 5. Cron diario a las 02:00 para actualizar las estadísticas de Trello
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
      console.error('❌ Error en cron de actualización de Trello:', err);
    }
  });

  // 6. Montar rutas

  // 6.1 Rutas de autenticación (registro / login)
  app.use('/api/v1/auth', authRoutes);

  // 6.2 Rutas de moderador (reportes)
  app.use('/api/v1/mod', moderatorRoutes);

  // 6.3 Rutas de administrador (usuarios, etc.)
  app.use('/api/v1/admin', adminRoutes);

  // 6.4 Rutas de Trello (API principal)
  app.use('/api/v1', trelloRoutes);

  // 7. Iniciar el servidor
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`🚀 Server listo en puerto ${PORT}`);
  }).on('error', (err) => {
    console.error('❌ Error arrancando el servidor:', err);
  });
}

// 8. Lanzar el servidor
startServer().catch((err) => {
  console.error('❌ No se pudo iniciar el servidor:', err);
});
