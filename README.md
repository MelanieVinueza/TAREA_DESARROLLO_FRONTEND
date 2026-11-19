# TAREA_DESARROLLO_FRONTEND

Interfaz web responsive para consultar y administrar productos mediante la API REST del proyecto. Está construida con HTML, CSS y JavaScript nativo; no requiere instalar dependencias.

El backend correspondiente está en [TAREA_DESARROLLO_BACKEND](https://github.com/MelanieVinueza/TAREA_DESARROLLO_BACKEND).

## Requisitos

- Node.js 22 o superior.
- El backend en ejecución, con PostgreSQL configurado.

## Ejecutar en Windows / PowerShell

```powershell
node server.js
```

Abre <http://localhost:5173>. El backend escucha por defecto en <http://127.0.0.1:5050> y su configuración CORS admite el origen del frontend. En la interfaz, el campo **API** permite cambiar la URL; se guarda en el navegador.

Si se usa otro puerto o dirección para el frontend, agrega su origen exacto a `CORS_ORIGINS` en el `.env` del backend y reinicia el servidor. No uses `*` como origen.

## Funciones

- Listado paginado de productos y filtro local de la página visible.
- Crear, editar y eliminar productos.
- Validación de campos, mensajes de conexión y errores de la API.
- Diseño adaptable a móvil y escritorio.

GitHub Actions comprueba la sintaxis de JavaScript y hace una prueba HTTP del servidor estático en cada push o pull request a `main`.

## Validaciones automáticas

En Node.js 22, 24 y 26, CI instala versiones bloqueadas con `npm ci`, revisa el árbol de dependencias con `npm ls`, ejecuta `npm audit`, comprueba que no haya ciclos entre módulos con Madge y valida la sintaxis y rutas HTTP del servidor. CodeQL analiza JavaScript con consultas `security-extended` en cada cambio y semanalmente. Dependabot revisa actualizaciones de npm y GitHub Actions.

La aplicación no usa framework ni dependencias de ejecución; Madge se usa solo para desarrollo y validación de la estructura modular.
