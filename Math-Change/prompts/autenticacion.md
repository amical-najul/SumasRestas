# Master Prompt para Integración de Autenticación con Firebase

Este documento contiene un "Meta-Prompt" diseñado para solicitar a cualquier IA (ChatGPT, Claude, Gemini) la implementación completa, robusta y segura de autenticación con Firebase en una aplicación web moderna.

Copia y pega el bloque de código de abajo cuando necesites esta funcionalidad.

---

## 📋 El Prompt (Copiar desde aquí)

```markdown
Actúa como un Arquitecto de Software Senior y Experto en Seguridad Web.
Tu tarea es diseñar e implementar un sistema de autenticación completo utilizando **Firebase Authentication** integrado en una aplicación "Híbrida" (Frontend + Backend Propio).

### 🏗️ Contexto del Proyecto
*   **Frontend**: React (con TypeScript y Vite/Next.js).
*   **Backend**: Python (FastAPI) o Node.js (Express) - [Especificar tu backend aquí].
*   **Base de Datos**: PostgreSQL / Supabase / MongoDB - [Especificar tu DB aquí].
*   **Objetivo**: Usar Firebase para manejar el "Log In" seguro, pero mantener los datos del usuario (perfil, roles, estadísticas) en mi Base de Datos propia.
*   **Restricción**: **NO** usar Firestore. Solo Firebase Authentication y la DB propia.

### 📝 Configuración Inicial (Instrucciones para la IA)
*   Explica cómo registrar la Web App en el Dashboard de Firebase (`+ Add app` -> `</> Web`).
*   Pide al usuario que copie el código SDK (`firebaseConfig`) generado en el paso 2 de la configuración.
*   **Importante**: El prompt debe asumir que el usuario pegará su SDK config en `firebaseConfig.ts`.

### ⚙️ Requerimientos Funcionales Detallados

1.  **Registro e Inicio de Sesión (Email/Password)**:
    *   Soporte estándar para Email y Contraseña.
    *   **Verificación de Email Obligatoria**:
        *   Si el usuario se registra -> **NO** iniciar sesión automáticamente. Enviar email de verificación (`sendEmailVerification`) y mostrar pantalla: "Hemos enviado un correo a... Verifícalo para entrar".
        *   Si el usuario intenta entrar (`signInWithEmailAndPassword`) y `emailVerified` es `false` -> **Cerrar sesión inmediatamente** y mostrar la pantalla de "Verifica tu email".
        *   Botón para "Reenviar correo de verificación".

2.  **Autenticación con Google (Google Auth)**:
    *   Habilitar botón "Sign in with Google".
    *   Usar este icono/asset para el botón: `[INSERTAR LINK DEL ICONO AQUÍ]` (o un icono estándar de Google).
    *   El flujo debe manejar tanto Registro como Login (si el email ya existe, lo vincula o loguea).

3.  **Recuperación de Contraseña**:
    *   Agregar enlace "¿Olvidaste tu contraseña?" en el Login.
    *   Pantalla/Modal que pida el email.
    *   Al solicitarlo (`sendPasswordResetEmail`), mostrar mensaje: "Hemos enviado un enlace de recuperación a...".
    *   Botón para "Volver al Inicio de Sesión".

4.  **Gestión de Sesión (Frontend)**:
    *   `AuthContext`: Debe exponer `user` (solo si está verificado), `loading` y métodods (`login`, `register`, `logout`, `googleLogin`).
    *   Persistencia: `onAuthStateChange`.
    *   **Protección**: `<ProtectedRoute>` debe rechazar usuarios no autenticados O no verificados.

5.  **Integración con Backend (Modelo Híbrido)**:
    *   **Backend Middleware**: Intercepta `Authorization: Bearer <token>`.
    *   Verifica token con `firebase-admin` o claves públicas de Google.
    *   **Just-In-Time Provisioning**:
        *   Si el token es válido y el usuario NO existe en la DB propia -> Crearlo usando el `uid` y `email` de Firebase.
        *   Si ya existe -> Permitir acceso y devolver datos del usuario (Rol, Perfil, etc.).

### 📦 Entregables Requeridos
Genera el código completo para:
1.  `firebaseConfig.ts` (con placeholders para las keys).
2.  `AuthContext.tsx` (con la lógica de bloqueo por falta de verificación).
3.  `RegisterScreen.tsx`, `LoginScreen.tsx`, `ForgotPasswordScreen.tsx`, `VerifyEmailScreen.tsx`.
4.  **Backend Middleware**: Validador de token y lógica de aprovisionamiento JIT.

### 🛡️ Criterios de Calidad
*   Usa **TypeScript** estricto.
*   Manejo de errores visual (Toasts/Alertas).
*   Código limpio y modular.
```
