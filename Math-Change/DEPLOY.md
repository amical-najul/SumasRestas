# Guía de Despliegue en VPS (Math-Change)

Esta guía detalla los pasos para desplegar la aplicación en un servidor VPS con Docker, Portainer y Traefik.

## Prerrequisitos en VPS
1. **Docker y Docker Compose** instaldos.
2. **Red externa** llamada `traefik_proxy` creada:
   ```bash
   docker network create traefik_proxy
   ```
3. **Traefik** corriendo y conectado a esa red.

## Pasos de Despliegue

### 1. Preparar Archivos
Sube los siguientes archivos y carpetas a tu VPS (puedes usar `scp`, git o Portainer):
- `/backend` (carpeta completa)
- `/frontend` (carpeta completa)
- `docker-compose.prod.yml`
- `.env.prod.example` (renómbralo a `.env`)

### 2. Configurar Variables de Entorno
Crea un archivo `.env` basado en el ejemplo y edítalo:
```bash
cp .env.prod.example .env
nano .env
```
**Variables Clave:**
- `DOMINIO`: El dominio base donde se alojará la app (ej: `math.tudominio.com`).
- `NOMBRE_APP`: Identificador único para los contenedores (ej: `math-app`).
- `SUPABASE_...`: Tus credenciales de producción de Supabase.

### 3. Iniciar Contenedores
Ejecuta el siguiente comando para construir e iniciar los servicios:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## Verificación
1. **Frontend**: Accede a `https://tu-dominio.com`
   - Deberías ver la pantalla de Login.
2. **Backend API**: Accede a `https://tu-dominio.com/api/`
   - Deberías ver el mensaje de bienvenida `{"message": "Math-Change Backend API"}`.
3. **Documentación API**: Accede a `https://tu-dominio.com/docs`
   - Deberías ver la interfaz Swagger UI de FastAPI.

## Solución de Problemas (Troubleshooting)

- **Error 404 en /api**: Verifica que el middleware `stripprefix` esté funcionando y que los labels en `docker-compose.prod.yml` sean correctos.
- **Error de Conexión en Frontend**: Asegúrate de que `VITE_API_URL` en el `.env` apunte a `https://tu-dominio.com/api` (con `/api` al final) y que hayas reconstruido el contenedor (`--build`) después de cambiarlo, ya que Vite "quema" las variables en tiempo de build.
- **SSL no válido**: Verifica los logs de Traefik para asegurar que Let's Encrypt pudo generar el certificado.

---
**Nota sobre Routing**:
La configuración usa "Single Domain".
- Frontend: `tudominio.com/*`
- Backend: `tudominio.com/api/*` (Traefik elimina `/api` antes de enviar la petición al backend)
