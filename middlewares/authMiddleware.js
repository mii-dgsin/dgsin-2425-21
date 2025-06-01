// middlewares/authMiddleware.js

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'unS3cr3t_de_prueba';

//
// 1) verifyToken: extrae el JWT del header y garantiza que sea válido
//    Agrega `req.user = { userId, email, role }` si todo va bien
//
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  // authHeader debe ser "Bearer <token>"
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: 'Token no enviado.' });
  }

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      console.error('JWT inválido:', err);
      return res.status(401).json({ error: 'Token inválido.' });
    }
    // payload debería tener { userId, email, role, iat, exp }
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role
    };
    next();
  });
}

//
// 2) checkRole(rolesPermitidos: string[]): devuelve un middleware que
//    comprueba que req.user.role esté en rolesPermitidos
//
function checkRole(rolesPermitidos) {
  return (req, res, next) => {
    // Asegúrate de que verifyToken se ejecutó antes
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado.' });
    }
    if (!rolesPermitidos.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acceso prohibido.' });
    }
    next();
  };
}

module.exports = {
  verifyToken,
  checkRole
};
