# Flame & Dough

PWA de gestión de pizzería creada con Vite, JavaScript y Phaser 3.

## Iniciar

1. Instala Node.js (versión LTS) si aún no está instalado.
2. Desde esta carpeta ejecuta `npm install`.
3. Ejecuta `npm run dev` y abre la dirección que Vite muestra en la terminal.
4. Para generar los archivos de publicación, ejecuta `npm run build`; Vite los crea en `dist/`.

La app guarda el progreso en `localStorage`, intenta registrar un service worker en conexiones HTTP/HTTPS y puede seguir cargando los recursos ya visitados sin conexión.

## Funciones incluidas

- Registro e inicio de sesión con Firebase Authentication cuando se configura el proyecto. Sin Firebase, permite crear cuentas locales con contraseña derivada mediante PBKDF2; esas cuentas solo funcionan en el mismo navegador y dispositivo.
- Recuperación de contraseña por email y sincronización entre dispositivos disponibles al configurar Firebase; los hashes de las cuentas locales no se pueden recuperar por email.
- Guardado local y sincronización de progreso a Firestore cuando hay una cuenta Firebase configurada.
- Comunidad con perfiles públicos de juego, solicitudes de amistad, presencia en línea y clasificación por pizzas vendidas.
- Pizzería dibujada con Phaser, recetas desbloqueables, pedidos, inventario, preparación y ventas.
- Contratación, entrenamiento, cansancio, vacaciones y salarios de empleados.
- Expansiones, reputación, campañas, rival, investigación con temporizador, eventos, misiones y trofeos.
- Paneles de juego, comunidad, mejoras, laboratorio, objetivos, estadísticas y configuración.
- Local de pizzería ilustrado en perspectiva isométrica, con horno, mostrador, mesas, luces y clientes.
- Guardado automático cada cinco segundos, pausa y diseño adaptable.
- Tienda y panel de administración de demostración que indican explícitamente qué requiere servicios externos.

## Configurar Firebase

1. Copia `.env.example` como `.env.local` y coloca los valores de configuración web de Firebase.
2. Activa Email/Password en Firebase Authentication y crea la base Firestore.
3. Publica `firestore.rules` en Firestore Rules.
4. Para presencia en tiempo real, crea una Realtime Database, copia su URL de la consola de Firebase y úsala como `VITE_FIREBASE_DATABASE_URL`.
5. Publica `database.rules.json` en Realtime Database Rules.
6. Agrega `VITE_FIREBASE_DATABASE_URL` en Vercel para Production y vuelve a desplegar.

La comunidad publica nombre de usuario y estadísticas del juego (pizzas vendidas, reputación, estrellas y tiempo jugado), nunca el correo. Si Realtime Database no está configurada, amigos y clasificación funcionan con Firestore, pero no se muestra la presencia en línea. Las puntuaciones del prototipo las escribe el cliente; una clasificación competitiva con protección contra trampas requiere validación del lado del servidor.

Sin esa configuración, el usuario puede registrarse e iniciar sesión localmente en el mismo dispositivo. La contraseña no se guarda en texto plano; se almacena un hash PBKDF2 con sal en `localStorage`. Para cuentas compartidas entre dispositivos, configura Firebase.

## Integraciones comerciales pendientes

La tienda actual no cobra ni entrega productos y el dashboard muestra métricas locales de demostración. Para compras se necesita una función de servidor con Stripe o PayPal, verificación de webhooks y recibos; nunca se deben poner claves privadas en la app. AdSense necesita un publisher ID, validación del sitio y cumplimiento de sus políticas. Los datos de ingresos, instalaciones y retención también requieren instrumentación backend; el panel actual no inventa esas cifras.

El manifest y el service worker están en `public/`. Para publicar la PWA se requiere HTTPS y se recomienda añadir iconos de instalación propios.

