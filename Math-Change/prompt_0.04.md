# Changelog v0.04 - Math-Change Full Stack Migration

**Fecha**: 2025-12-16
**Repositorio Original**: https://github.com/amical-najul/Math-Change

---

## Resumen de Cambios

Migración completa de una aplicación React frontend a una arquitectura Full Stack con:
- **Backend**: Python FastAPI
- **Base de Datos**: Supabase (PostgreSQL)
- **Orquestación**: Docker Compose

---

## 1. Reestructuración del Proyecto

### Archivos Movidos
- Todo el contenido original → `frontend/`

### Archivos Nuevos Creados
- `backend/` (nueva carpeta)
- `docker-compose.yml`
- `.env`

---

## 2. Backend (Python FastAPI)

### Archivos Creados
| Archivo | Descripción |
|---------|-------------|
| `backend/main.py` | API endpoints (login, register, users, scores) |
| `backend/models.py` | Modelos Pydantic |
| `backend/requirements.txt` | Dependencias Python |
| `backend/Dockerfile` | Imagen Docker del backend |
| `backend/schema.sql` | Esquema de tablas para Supabase |
| `backend/setup_db.py` | Script de configuración DB |
| `backend/test_db_connection.py` | Test de conectividad |

### Endpoints Implementados
- `POST /login` - Autenticación
- `POST /register` - Registro de usuarios
- `GET /users` - Listar usuarios
- `POST /users` - Guardar/actualizar usuario
- `GET /scores` - Obtener puntuaciones
- `POST /scores` - Guardar puntuación

---

## 3. Frontend (React)

### Archivos Modificados
| Archivo | Cambio |
|---------|--------|
| `frontend/services/storageService.ts` | Refactorizado de localStorage a API REST async |
| `frontend/components/LoginScreen.tsx` | Añadido async/await |
| `frontend/components/LeaderboardScreen.tsx` | Añadido async/await |
| `frontend/components/ProfileScreen.tsx` | Añadido async/await |
| `frontend/components/AdminPanel.tsx` | Añadido async/await |
| `frontend/App.tsx` | Añadido async/await en handlers |
| `frontend/tsconfig.json` | Eliminado `types: ["node"]` (fix lint) |
| `frontend/index.html` | Añadido `<script type="module" src="/index.tsx">` |

### Archivos Nuevos
| Archivo | Descripción |
|---------|-------------|
| `frontend/Dockerfile` | Build multi-stage (Node + Nginx) |

---

## 4. Docker Compose

### Configuración Final
```yaml
services:
  backend:
    ports: "5000:8000"
    environment:
      - SUPABASE_URL
      - SUPABASE_KEY
      - SUPABASE_SERVICE_ROLE_KEY
      - DB_PASSWORD

  frontend:
    ports: "8080:80"
    build args:
      - VITE_API_URL: http://localhost:5000
```

---

## 5. Configuración Supabase

### Variables de Entorno (.env)
- `SUPABASE_URL`
- `SUPABASE_KEY` (Anon)
- `SUPABASE_SERVICE_ROLE_KEY` (Bypass RLS)
- `DB_PASSWORD`

### Tablas Creadas
- `users` (id, username, email, password, role, status, avatar, createdAt, lastLogin, settings, unlockedLevel)
- `scores` (id, user, score, correctCount, errorCount, avgTime, date, category, difficulty)

---

## 6. Bugs Corregidos

| Bug | Causa | Solución |
|-----|-------|----------|
| Backend no accedía a tablas | Usaba Anon Key con RLS | Cambiado a Service Role Key |
| Error tsconfig.json | `types: ["node"]` inválido | Eliminado |
| Registro fallaba (500) | Serialización Pydantic | Mejorado `register()` |
| Pantalla azul vacía | Faltaba script entry | Añadido `<script src="/index.tsx">` |

---

## 7. URLs de Acceso

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:8080 |
| Backend API | http://localhost:5000 |
| API Docs (Swagger) | http://localhost:5000/docs |

---

## Comandos Docker

```bash
# Construir y levantar
docker-compose up --build

# Solo backend
docker-compose up -d backend

# Solo frontend
docker-compose up -d --build frontend

# Ver logs
docker-compose logs -f

# Test de conexión DB
docker-compose exec -T backend python test_db_connection.py
```
