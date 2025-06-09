# API REST de Bug Reports

## Recurso: `/api/v1/reports`

Esta API permite la gestión de reportes de errores.

---

## POST /api/v1/reports

**Crea un nuevo reporte.**

- 🔐 Requiere autenticación (token JWT).
- 🟢 Código 201 si éxito, 🔴 400 si faltan campos, 🔴 409 si título duplicado.

### Ejemplo de petición:

```json
POST /api/v1/reports
Authorization: Bearer TOKEN

{
  "title": "Error crítico en login",
  "description": "No se puede iniciar sesión con Firefox.",
  "type": "bug"
}
