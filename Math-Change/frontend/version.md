# Historial de Cambios - Math Challenge

## Versión 0.0.4 (Migración Full Stack)

### 🏗️ Arquitectura Full Stack
*   **Backend Python (FastAPI):**
    *   Nuevo servidor API RESTful de alto rendimiento.
    *   Endpoints dedicados para autenticación (`/login`, `/register`), usuarios y puntuaciones.
*   **Base de Datos en la Nube (Supabase):**
    *   Migración de `localStorage` a PostgreSQL persistente.
    *   Gestión centralizada de usuarios y rankings globales.
*   **Dockerización:**
    *   Orquestación de servicios con `docker-compose`.
    *   Entornos aislados y reproducibles para Frontend y Backend.

### 🔌 Integración Frontend
*   **Persistencia Real:** Los datos ahora se guardan en la nube, permitiendo acceso desde múltiples dispositivos.
*   **Optimización:** Refactorización de servicios para comunicación asíncrona robusta.
*   **Correcciones:** Solución a problemas de carga (pantalla azul) y configuración de puertos (`8080` frontend / `5000` backend).

---

## Versión 0.0.3 (Sistema de Usuarios y Administración)

### 🔐 Autenticación y Perfiles
*   **Pantalla de Login/Registro:** Permite crear cuentas persistentes o jugar como invitado.
*   **Gestión de Perfil:**
    *   Edición de Usuario/Email/Contraseña.
    *   **Avatar:** Subida de foto de perfil personalizada.
    *   **Configuración de Juego:** Personalización del temporizador (3s - 60s) por nivel de dificultad.

### 🛡️ Panel de Administración (Admin Dashboard)
*   **Dashboard de Estadísticas:** KPIs de usuarios totales, activos, administradores y uso de almacenamiento.
*   **Gestión de Usuarios (CRUD):**
    *   Creación, Edición y Eliminación de usuarios vía Modales.
    *   **Control de Estado:** Soft Ban (Activar/Desactivar usuarios).
    *   **Roles:** Promoción de usuarios a Administradores.
    *   Buscador integrado en tiempo real.

## Versión 0.0.2 (Mejora para Tablets)

### 📱 UI/UX Adaptativo
*   **Modo Tablet Horizontal (Landscape):**
    *   Nuevo diseño de pantalla dividida para aprovechar el espacio ancho.
    *   **Panel Izquierdo:** Mantiene la tarjeta de juego original.
    *   **Panel Derecho:** Nuevo **Teclado Numérico Virtual**.

## Versión 0.0.1 (Versión Inicial)

### 🚀 Características Principales
*   **Motor de Aritmética:** Generación de preguntas matemáticas dinámicas.
*   **Sistema de Dificultad:** 5 niveles y modos mixtos.
*   **Módulos Educativos:** Estudiar Tablas.
