// middlewares/authMiddleware.js

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'cambiame_por_un_secreto_presupuesto';

// Verifica que el header Authorization tiene un Bearer <token> válido
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No se proporcionó token.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Añadimos a req.user los datos del payload (userId, email, role, etc.)
    req.user = decoded;
    next();
  } catch (err) {
    console.error('JWT no válido:', err);
    return res.status(403).json({ error: 'Token inválido o expirado.' });
  }
}

// Middleware factory para verificar roles permitidos
function checkRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: 'No autenticado.' });
    }
    const userRole = req.user.role;
    // Si el rol del usuario no está en la lista permitida, denegamos acceso
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'No tienes permisos para esta operación.' });
    }
    next();
  };
}

module.exports = { verifyToken, checkRole };
