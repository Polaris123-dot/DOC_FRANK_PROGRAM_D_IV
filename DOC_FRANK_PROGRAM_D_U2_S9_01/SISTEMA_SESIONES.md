# Sistema de Sesiones - Documentación

## 📋 Resumen

Se ha implementado un sistema de autenticación basado en sesiones del servidor.

## 🚀 Instalación

### 1. Instalar dependencias

```bash
npm install
```

Esto instalará:
- `express-session`: Gestión de sesiones en el servidor
- `bcrypt`: Hash de contraseñas (preparado para uso futuro)

### 2. Iniciar el servidor

```bash
node server.js
```

## 🔐 Funcionalidades

### Sistema de Sesiones

- ✅ Sesiones gestionadas en el servidor (express-session)
- ✅ Cookies seguras (httpOnly) 
- ✅ Duración de sesión: 24 horas
- ✅ Middleware de autenticación (`requireAuth`)
- ✅ Verificación de sesión en cada solicitud

### Rutas Protegidas

Todas las rutas que requieren autenticación:
- `GET /asignaciones/:id_docente`
- `GET /asignaciones/:id_asignacion/alumnos`
- `POST /notas`

### Nuevas Rutas

- `POST /logout` - Cerrar sesión del usuario
- `GET /api/session` - Verificar estado de sesión actual

## 📝 Uso

### Login

```javascript
POST /login
{
  "email": "docente@ejemplo.com",
  "password": "1234"
}
```

Respuesta:
```json
{
  "ok": true,
  "mensaje": "✅ Acceso concedido",
  "docente": {
    "id_docente": 1,
    "nombre": "Juan",
    "apellido": "Pérez"
  }
}
```

### Verificar Sesión

```javascript
GET /api/session
// Verifica si hay una sesión activa
```

### Logout

```javascript
POST /logout
// Destruye la sesión del usuario
```

## 🛡️ Middleware

### requireAuth

Verifica que el usuario esté autenticado:

```javascript
app.get("/ruta-protegida", requireAuth, handler);
```

## 🔧 Configuración de CORS

El sistema está configurado para funcionar con cookies de sesión:

```javascript
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true  // Importante para cookies
}));
```

## 📱 Cambios en el Frontend

### Login (login.html)

- Agregado `credentials: 'include'` en fetch
- Guarda información básica del docente

### Dashboard (dashboard.html)

- Verifica sesión con `/api/session` al cargar
- Usa `credentials: 'include'` en todas las llamadas
- Función de logout actualizada para usar el endpoint del servidor

### Alumnos (alumnos.html)

- Todas las llamadas fetch incluyen `credentials: 'include'`

## 🔒 Seguridad

### Mejoras Implementadas

1. ✅ Sesiones en servidor (no solo localStorage)
2. ✅ Cookies httpOnly (no accesibles desde JavaScript)
3. ✅ Middleware de autenticación

### Pendientes para Producción

1. ⚠️ **IMPORTANTE**: Cambiar secret de sesión por variable de entorno
2. ⚠️ Implementar bcrypt para hashear contraseñas
3. ⚠️ Usar HTTPS y cambiar `secure: true` en cookies
4. ⚠️ Implementar rate limiting para prevenir ataques de fuerza bruta

## 📂 Archivos Modificados

```
├── package.json                    # Agregadas dependencias
├── server.js                       # Sistema de sesiones
├── public/login.html               # Soporte de credenciales
├── public/dashboard.html           # Verificación de sesión
└── public/alumnos.html             # Credenciales en fetch
```

## 🧪 Pruebas

1. **Iniciar servidor:**
   ```bash
   node server.js
   ```

2. **Acceder al login:**
   ```
   http://localhost:3000/login.html
   ```

3. **Verificar que se crea sesión:**
   - Debe aparecer en consola: "✅ Sesión creada para: [nombre]"

4. **Probar logout:**
   - Click en "Cerrar Sesión"
   - Debe redirigir a login

5. **Intentar acceder sin sesión:**
   - Cerrar sesión
   - Intentar acceder directamente a dashboard
   - Debe redirigir a login

## 🚨 Solución de Problemas

### Error: "No autorizado. Debe iniciar sesión"

**Causa**: No hay sesión activa en el servidor

**Solución**: 
1. Asegúrate de haber iniciado sesión correctamente
2. Verifica que las cookies se están enviando (usar DevTools > Network)
3. Verifica que CORS está configurado con `credentials: true`

### Cookies no se guardan

**Causa**: Configuración de CORS o cookies

**Solución**:
1. Verifica que `credentials: 'include'` está en todas las llamadas fetch
2. Verifica configuración de CORS en server.js
3. En producción, usa HTTPS para cookies seguras

## 🎉 ¡Sistema Listo!

El sistema de sesiones está completamente funcional. Todas las rutas están protegidas y el frontend está actualizado para usar el nuevo sistema de autenticación.

