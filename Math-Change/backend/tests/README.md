# 🧪 Tests - Math-Change

Esta carpeta contiene todos los tests del proyecto Math-Change.

---

## 📁 Archivos de Test

| Archivo | Descripción |
|---------|-------------|
| `test_s3_connection.py` | Prueba conexión y CRUD con bucket S3/MinIO |
| `test_db_connection.py` | Prueba conexión directa a PostgreSQL/Supabase |
| `test_crud_flow.py` | Prueba operaciones CRUD en tabla `users` vía Supabase API |
| `test_api_integration.py` | Prueba integración completa Frontend-Backend (legacy) |
| `frontend_test_notes.md` | Notas y observaciones de testing del frontend |

---

## 🚀 Cómo Ejecutar los Tests

### Prerrequisitos

Asegúrate de que las variables de entorno estén configuradas en `.env`:
- `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_ENDPOINT_URL`, `S3_BUCKET_NAME`

### Ejecutar con Docker (Recomendado)

```powershell
# Desde la raíz del proyecto
cd Math-Change

# Ejecutar test específico
docker compose run --rm backend python tests/test_s3_connection.py
docker compose run --rm backend python tests/test_db_connection.py
docker compose run --rm backend python tests/test_crud_flow.py
```

### Ejecutar Localmente (Requiere Python)

```powershell
# Instalar dependencias
pip install boto3 python-dotenv supabase psycopg2-binary requests

# Ejecutar desde la raíz del proyecto
python tests/test_s3_connection.py
python tests/test_db_connection.py
python tests/test_crud_flow.py
```

---

## 📋 Descripción Detallada

### 1. `test_s3_connection.py` - S3/MinIO Bucket Test

**Finalidad**: Verificar la conexión y operaciones con el bucket S3/MinIO para subida de avatares.

**Tests incluidos**:
- ✅ Conexión al servidor S3
- ✅ Verificación de que el bucket existe
- ✅ **CREATE** - Subir archivo de prueba
- ✅ **READ** - Leer archivo subido
- ✅ **LIST** - Listar objetos en bucket
- ✅ **DELETE** - Eliminar archivo de prueba

**Ejemplo de ejecución**:
```powershell
docker compose run --rm backend python tests/test_s3_connection.py
```

**Resultado esperado**:
```
============================================================
📊 RESUMEN DE RESULTADOS
============================================================
  Conexión: ✅ PASS
  Bucket Existe: ✅ PASS
  CREATE: ✅ PASS
  READ: ✅ PASS
  LIST: ✅ PASS
  DELETE: ✅ PASS

  Total: 6/6 tests pasados
✅ TODOS LOS TESTS PASARON - Bucket configurado correctamente!
```

---

### 2. `test_db_connection.py` - Database Connection Test

**Finalidad**: Verificar conexión directa a PostgreSQL (Supabase) usando psycopg2.

**Tests incluidos**:
- Conexión directa (puerto 5432)
- Conexión via pooler (puerto 6543)

**Variables requeridas**:
- `DB_PASSWORD`

**Ejemplo de ejecución**:
```powershell
docker compose run --rm backend python tests/test_db_connection.py
```

---

### 3. `test_crud_flow.py` - Supabase CRUD Test

**Finalidad**: Probar operaciones CRUD completas en la tabla `users` usando la API de Supabase.

**Tests incluidos**:
- ✅ **CREATE** - Insertar usuario de prueba
- ✅ **READ** - Leer usuario por email
- ✅ **UPDATE** - Actualizar campo `unlockedLevel`
- ✅ **DELETE** - Eliminar usuario de prueba (cleanup)

**Variables requeridas**:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**Ejemplo de ejecución**:
```powershell
docker compose run --rm backend python tests/test_crud_flow.py
```

---



## 🔧 Solución de Problemas

### Error: "Variables faltantes"
Verifica que tu archivo `.env` tenga todas las variables requeridas configuradas.

### Error: "Connection refused"
1. Verifica que Docker esté corriendo
2. Reconstruye las imágenes: `docker compose build`

### Error: "NoSuchBucket"
El bucket S3 no existe. Verifica `S3_BUCKET_NAME` en `.env`.

---

## ✅ Estado de Tests

| Test | Última Ejecución | Estado |
|------|------------------|--------|
| S3 Connection | 2025-12-17 | ✅ PASS (6/6) |
| DB Connection | - | Pendiente |
| CRUD Flow | - | Pendiente |
| API Integration | - | Legacy/Revisar |
