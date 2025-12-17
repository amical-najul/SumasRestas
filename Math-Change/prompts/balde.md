# Master Prompt para Integración de Almacenamiento en Bucket (S3/MinIO)

Este documento contiene un "Meta-Prompt" diseñado para solicitar a cualquier IA (ChatGPT, Claude, Gemini) la implementación de subida de archivos (imágenes de perfil, documentos) a un Bucket S3 compatible (AWS S3, MinIO, Cloudflare R2, DigitalOcean Spaces).

Copia y pega el bloque de código de abajo cuando necesites esta funcionalidad.

---

## 📋 El Prompt (Copiar desde aquí)

```markdown
Actúa como un Ingeniero DevOps y Desarrollador Full-Stack Senior.
Necesito que integres una funcionalidad de **Carga de Archivos a un Bucket S3** en mi aplicación web.

### 🏗️ Contexto del Proyecto
*   **Frontend**: React (TypeScript) usando `fetch` o `axios`.
*   **Backend**: Python (FastAPI/Boto3) o Node.js (AWS SDK) - [Especificar tu backend].
*   **Proveedor S3**: AWS S3 / MinIO / DigitalOcean Spaces / Generic S3 - [Especificar].
*   **Credenciales**: Tengo Access Key, Secret Key, Endpoint URL y Bucket Name.

### 🎯 Objetivo
Permitir que los usuarios suban archivos (ej: Foto de Perfil) desde el navegador, que el Backend actúe como proxy seguro (o genere Presigned URLs) y que la URL final se guarde en la Base de Datos.

### ⚙️ Requerimientos Técnicos
1.  **Backend (API)**:
    *   Configurar el cliente S3 (usando `boto3` o `aws-sdk`).
    *   **Endpoint de Carga**: `POST /upload-avatar` (u otro) que reciba `FormData`.
    *   Validar tipo de archivo (solo imágenes) y tamaño máximo (ej: 5MB).
    *   Generar un nombre de archivo único (usando UUID + extensión original) para evitar colisiones.
    *   Manejar errores de conexión con el bucket (try/catch).
    *   Retornar la URL pública del archivo subido.
2.  **Frontend (UI)**:
    *   Componente de subida con `<input type="file" hidden />` y botón disparador.
    *   Validación previa en cliente (tamaño/tipo).
    *   Barra de progreso o estado "Subiendo...".
    *   Actualizar la vista con la nueva URL retornada.
### 🔧 Configuración Requerida (Variables de Entorno)
**Instrucción para la IA**: Pide explícitamente al usuario que configure estas variables en su archivo `.env`.

*   `S3_ACCESS_KEY`: La clave pública del bucket.
*   `S3_SECRET_KEY`: La clave privada (Secret).
*   `S3_ENDPOINT_URL`: La URL del proveedor (ej: `https://files.n8nprueba.shop` o `https://s3.amazonaws.com`).
*   `S3_BUCKET_NAME`: El nombre del "balde" donde se guardarán los archivos.
*   `S3_REGION`: (Opcional pero recomendado) La región del bucket (ej: `us-east-1` o `auto`).

### 🛡️ Seguridad
*   Las credenciales (`ACCESS_KEY`, `SECRET_KEY`) deben leerse SIEMPRE de Variables de Entorno.
*   NUNCA las incluyas harcoded en el código.
*   El bucket debe permitir lectura pública (`ACL: public-read`) para que las imágenes sean visibles en el frontend.

### 📦 Entregables
Por favor genera:
1.  **Código Backend**: Configuración del cliente S3 y el endpoint de carga.
2.  **Código Frontend**: Servicio de API (`uploadService.ts`) y componente de React.
3.  **Configuración**: Lista de variables de entorno necesarias (`S3_ENDPOINT`, `S3_BUCKET`, etc.).

### 💡 Ejemplo de Flujo Esperado
Frontend envía `File` -> Backend valida y sube a S3 -> S3 devuelve OK -> Backend guarda URL en DB -> Backend devuelve URL al Frontend -> Frontend muestra imagen nueva.
```
