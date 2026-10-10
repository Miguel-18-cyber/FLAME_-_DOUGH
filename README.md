# Flame & Dough

PWA de gestión de pizzería creada con Vite, JavaScript y Phaser 3.

## Iniciar

1. Instala Node.js (versión LTS) si aún no está instalado.
2. Desde esta carpeta ejecuta `npm install`.
3. Ejecuta `npm run dev` y abre la dirección que Vite muestra en la terminal.
4. Para generar los archivos de publicación, ejecuta `npm run build`; Vite los crea en `dist/`.

La app guarda el progreso en `localStorage`, intenta registrar un service worker en conexiones HTTP/HTTPS y puede seguir cargando los recursos ya visitados sin conexión.

## Funciones incluidas

- Acceso y registro con Firebase Authentication cuando se configura el proyecto; recuperación de contraseña por email, persistencia local de sesión y reserva de nombre único en Firestore.
- Guardado local y sincronización de progreso a Firestore cuando hay una cuenta Firebase configurada.
- Pizzería dibujada con Phaser, recetas desbloqueables, pedidos, inventario, preparación y ventas.
- Contratación, entrenamiento, cansancio, vacaciones y salarios de empleados.
- Expansiones, reputación, campañas, rival, investigación con temporizador, eventos, misiones y trofeos.
- Paneles de juego, mejoras, laboratorio, objetivos, estadísticas y configuración.
- Guardado automático cada cinco segundos, pausa y diseño adaptable.
- Tienda y panel de administración de demostración que indican explícitamente qué requiere servicios externos.

## Configurar Firebase

1. Copia `.env.example` como `.env.local` y coloca los valores de configuración web de Firebase.
2. Activa Email/Password en Firebase Authentication y crea la base Firestore.
3. Publica `firestore.rules` en el proyecto Firebase.

Sin esa configuración, la aplicación usa un perfil de demostración guardado localmente. No guarda contraseñas localmente.

## Integraciones comerciales pendientes

La tienda actual no cobra ni entrega productos y el dashboard muestra métricas locales de demostración. Para compras se necesita una función de servidor con Stripe o PayPal, verificación de webhooks y recibos; nunca se deben poner claves privadas en la app. AdSense necesita un publisher ID, validación del sitio y cumplimiento de sus políticas. Los datos de ingresos, instalaciones y retención también requieren instrumentación backend; el panel actual no inventa esas cifras.

El manifest y el service worker están en `public/`. Para publicar la PWA se requiere HTTPS y se recomienda añadir iconos de instalación propios.

