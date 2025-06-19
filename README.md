# Dgsin242521 Backend

Este proyecto representa el backend de la aplicación del módulo DGSIN, desarrollado en **Node.js v22** con Express y MongoDB Atlas.

## Requisitos Previos

- Node.js v22+
- npm
- MongoDB Atlas (o un clúster compatible)
- Variables de entorno (.env) configuradas para tu conexión y JWT

## Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/tu-usuario/dgsin242521-backend.git
cd dgsin242521-backend
```

2. Instala las dependencias:
```bash
npm install
```

## Ejecución en local

```bash
node index.js
```

El servidor se iniciará en `http://localhost:8080` por defecto.

## Estructura del Proyecto

- `index.js`: punto de entrada principal
- `routes/`: rutas de la API REST
- `scrape/`: lógica de scrapper de trello
- `middleware/`: autenticación, control de errores, etc.
- `docs/`: documentación Markdown de la API
- `public/`: archivos estáticos como documentación o HTML inicial
- `.env`: variables de entorno (añadir manualmente)

## Endpoints Relevantes

- `/api/v1/reports`: CRUD para reportes
- `/api/v1/reports/loadInitialData`: carga de datos inicial
- `/api/v1/reports/docs`: redirección a documentación en Postman

## Despliegue

Este backend está preparado para desplegarse en **Google App Engine**. Asegúrate de tener:

- `app.yaml` configurado
- Conexión segura a MongoDB Atlas
- Variables de entorno cargadas

## Testing

Se ha incluido una colección de Postman para testear todos los endpoints conforme a la tabla azul del módulo Backend, incluyendo casos de error.

## Autor

- **Rafael Balbuena López**
- Grupo: DGSIN-2425-21