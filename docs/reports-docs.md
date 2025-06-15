# API REST de Bug Reports

## Recurso: `/api/v1/reports`

Esta API permite la gestión de reportes de errores.

---

## POST `/api/v1/reports`

**Crea un nuevo reporte.**

- 🔐 Requiere autenticación (token JWT).
- 🟢 **201 Created** si se crea correctamente.
- 🔴 **400 Bad Request** si faltan campos obligatorios (`title`, `description`, `type`).
- 🔴 **409 Conflict** si ya existe un reporte con el mismo título.
- 🔴 **405 Method Not Allowed** si se usa un método distinto a POST.

### Ejemplo de petición:

```http
POST /api/v1/reports HTTP/1.1
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "title": "Error crítico en login",
  "description": "No se puede iniciar sesión con Firefox.",
  "type": "bug"
}
```

### Ejemplo de respuesta (201):

```json
HTTP/1.1 201 Created
{
  "message": "Reporte creado",
  "id": "684ebcb255ff5c26ddca16b4"
}
```

---

## GET `/api/v1/reports`

**Recupera todos los reportes.**

- 🔐 **Opcional**: no requiere token para consulta pública, pero puede protegerse.
- 🟢 **200 OK** y arreglo JSON con todos los reportes.
- 🔴 **405 Method Not Allowed** si se usa un método distinto a GET.

### Ejemplo de petición:

```http
GET /api/v1/reports HTTP/1.1
```

### Ejemplo de respuesta (200):

```json
[
  {
    "_id": "684ebcb255ff5c26ddca16b4",
    "reporterId": "683b05603fa3c6c40d465443",
    "title": "Error crítico en login",
    "description": "No se puede iniciar sesión con Firefox.",
    "type": "bug",
    "status": "pending",
    "createdAt": "2025-06-15T14:24:00.000Z",
    "updatedAt": "2025-06-15T14:24:00.000Z"
  },
  // ... más reportes
]
```

---

## DELETE `/api/v1/reports`

**Elimina todos los reportes.**

- 🔐 Requiere token JWT con rol `admin`.
- 🟢 **200 OK** con mensaje de eliminados.
- 🔴 **403 Forbidden** si el usuario no es `admin`.
- 🔴 **405 Method Not Allowed** si se usa otro método.

### Ejemplo de petición:

```http
DELETE /api/v1/reports HTTP/1.1
Authorization: Bearer {{adminToken}}
```

### Ejemplo de respuesta (200):

```json
HTTP/1.1 200 OK
{
  "message": "Se eliminaron 10 reportes."
}
```

---

## GET `/api/v1/reports/:id`

**Recupera un reporte por su ID.**

- 🔐 **Opcional**: no requiere token, pero puede protegerse.
- 🟢 **200 OK** con el objeto JSON del reporte.
- 🔴 **400 Bad Request** si `id` no es un ObjectId válido.
- 🔴 **404 Not Found** si no existe el reporte.
- 🔴 **405 Method Not Allowed** si se usa otro método.

### Ejemplo de petición (200):

```http
GET /api/v1/reports/684ebcb255ff5c26ddca16b4 HTTP/1.1
```

### Ejemplo de respuesta (200):

```json
{
  "_id": "684ebcb255ff5c26ddca16b4",
  "reporterId": "683b05603fa3c6c40d465443",
  "title": "Error crítico en login",
  "description": "No se puede iniciar sesión con Firefox.",
  "type": "bug",
  "status": "pending",
  "createdAt": "2025-06-15T14:24:00.000Z",
  "updatedAt": "2025-06-15T14:24:00.000Z"
}
```

---

## PUT `/api/v1/reports/:id`

**Actualiza un reporte existente.**

- 🔐 Requiere autenticación JWT.
- 🟢 **200 OK** al actualizar.
- 🔴 **400 Bad Request** si `id` inválido o si el `_id` en el body no coincide con la URL.
- 🔴 **403 Forbidden** si el usuario no es propietario ni rol `moderator`/`admin`.
- 🔴 **404 Not Found** si no existe el reporte.
- 🔴 **405 Method Not Allowed** si se usa otro método.

### Ejemplo de petición:

```http
PUT /api/v1/reports/684ebcb255ff5c26ddca16b4 HTTP/1.1
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "title": "Error corregido en login",
  "description": "Ahora funciona en Firefox.",
  "type": "bug"
}
```

### Ejemplo de respuesta (200):

```json
HTTP/1.1 200 OK
{
  "message": "Reporte actualizado."
}
```

---

## DELETE `/api/v1/reports/:id`

**Elimina un reporte por su ID.**

- 🔐 Requiere token JWT.
- 🟢 **200 OK** al eliminar.
- 🔴 **400 Bad Request** si `id` inválido.
- 🔴 **403 Forbidden** si no es propietario ni `moderator`/`admin`.
- 🔴 **404 Not Found** si no existe el reporte.
- 🔴 **405 Method Not Allowed** si se usa otro método.

### Ejemplo de petición:

```http
DELETE /api/v1/reports/684ebcb255ff5c26ddca16b4 HTTP/1.1
Authorization: Bearer {{token}}
```

### Ejemplo de respuesta (200):

```json
HTTP/1.1 200 OK
{
  "message": "Reporte eliminado."
}
```

---

## GET `/api/v1/reports/docs`

**Redirige a la documentación (Postman) de esta API.**

- 🔐 Opciónally protected.
- 🟢 **302 Found** con `Location: <URL a docs en Postman>`.
- 🔴 **405 Method Not Allowed** si se usa otro método.

### Ejemplo de petición:

```http
GET /api/v1/reports/docs HTTP/1.1
```

### Ejemplo de respuesta (302):

```
HTTP/1.1 302 Found
Location: https://documenter.getpostman.com/view/XXXXXX
```

---

> **405 Method Not Allowed** Para cualquier ruta de `/api/v1/reports` o `/api/v1/reports/:id`, si se usa un método no soportado (por ejemplo PATCH en `/reports`), la API devolverá **405 Method Not Allowed**.

> **Errores comunes**
>
> - `400` para solicitudes mal formadas o IDs inválidos.
> - `403` para intentos de edición/eliminación sin permisos.
> - `404` cuando el recurso no existe.
> - `409` en conflictos de creación duplicada.

