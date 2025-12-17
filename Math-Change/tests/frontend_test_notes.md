Guía de Prompts para Verificación de Sistemas
Este documento contiene una colección de "Prompts Maestros" diseñados para solicitar a tu Agente de IA que realice pruebas de integración profundas en tu aplicación. Estos prompts están basados en la metodología exitosa utilizada en el proyecto Math-Change.

1. Verificación Backend <-> Base de Datos
Utiliza este prompt cuando quieras confirmar que tu servidor puede leer y escribir correctamente en la base de datos, más allá de una simple conexión (ping).

📋 Prompt para el Agente:
"Necesito verificar la integridad de la conexión entre el Backend y la Base de Datos. Por favor, crea y ejecuta un script de prueba local (por ejemplo, 
test_crud_flow.py
) que replique el comportamiento del cliente real de la aplicación.

El script debe realizar un ciclo CRUD completo:

Create: Insertar un registro de prueba (ej: un usuario con todos sus campos obligatorios).
Read: Leer ese registro inmediatamente para confirmar persistencia.
Update: Modificar un campo del registro para verificar permisos de escritura.
Delete: Eliminar el registro para limpiar la base de datos.
Analiza si hay errores semánticos (tipos de datos incorrectos) o lógicos (permisos denegados) en el proceso."

2. Verificación Frontend <-> Backend (Simulación)
Utiliza este prompt cuando quieras asegurar que tu Backend está listo para recibir peticiones del Frontend, especialmente si no tienes tests de UI (Cypress/Jest) configurados.

📋 Prompt para el Agente:
"Quiero probar la integración entre el Frontend y el Backend sin usar el navegador. Por favor, crea un script de prueba (ej: 
test_api_integration.py
) que actúe como un 'Frontend Virtual' simulando las peticiones HTTP que haría la aplicación real.

El script debe probar el Flujo Crítico de Usuario:

Registro: Enviar una petición POST a /register con datos JSON simulados y verificar que retorna un Token exitoso.
Login: Enviar credenciales a /login y capturar el Token de sesión.
Operación Protegida: Usar el Token capturado para intentar una acción segura (ej: guardar un puntaje en /scores) y validar que el backend la acepta (Código 200).
Seguridad: Intentar acceder a una ruta de Administrador con este usuario normal y verificar que el backend lo bloquea (Error 403).
Ejecuta este script y entrégame un reporte de los resultados."

💡 Consejos Adicionales
Si usas Docker: Pide al agente que "Ejecute el script usando el entorno de contenedores existente (docker compose run) para asegurar que tiene acceso a las redes internas".
Si hay errores: Pide al agente que "Analice si el error es de infraestructura (puertos cerrados) o de código (bugs en la librería, versiones incompatibles)".