# SnapGram | Red Social Full-Stack con Cifrado E2EE

![Landing Page](https://mir-s3-cdn-cf.behance.net/project_modules/fs_webp/1e3f06242284039.6969a806a08e0.png)

## 📌 Descripción del Proyecto
Este proyecto es una plataforma de red social que prioriza la **seguridad del usuario** y la **interactividad en tiempo real**. Desarrollada como un ecosistema completo, la aplicación permite la creación de contenido, interacción social y mensajería privada protegida bajo estándares de cifrado modernos.

El enfoque principal fue construir una infraestructura robusta y escalable sin depender de soluciones externas para las funcionalidades críticas, demostrando así un dominio avanzado en arquitectura de software y manejo de datos sensibles.

---

## 🚀 Características Técnicas Destacadas

### 🔐 Privacidad y Seguridad Avanzada
* **Cifrado de Extremo a Extremo (E2EE):** Mensajería privada y grupal protegida mediante la **Web Crypto API**. Para permitir acceso desde múltiples dispositivos, las llaves de cifrado pública y privada del usuario se almacenan de forma segura en la base de datos, cifradas mediante una llave AES generada a partir de un PIN de 6 dígitos que el usuario debe introducir al registrarse y luego se le solicita al ingresar al chat. Sólo al ingresar el PIN correcto cargan sus conversaciones y se desencriptan. El cifrado se realiza en el navegador, garantizando que el servidor nunca tenga acceso al contenido de los mensajes.
* **Autenticación Segura:** Implementación de autenticación segura basada en Google OAuth y tradicional (email/password) mediante **Clerk**.
* **Gestión de Privacidad:** Control total sobre la cuenta, incluyendo bloqueos de usuarios, desactivación temporal y eliminación permanente e inmediata de la cuenta.

### ⚡ Comunicación en Tiempo Real (Nativa)
* **Arquitectura Socket.io:** Se evitó la dependencia de servicios de terceros (como Pusher o Stream.io) para la comunicación en tiempo real, implementé Socket.io nativamente para la gestión de chats y notificaciones.
* **Mensajería Multimedia:** Soporte completo para notas de voz, imágenes y texto en tiempo real. Tanto el texto como los archivos de imagen y notas de voz se cifran en tiempo real.

### 📱 Experiencia de Usuario y Engagement
* **Feed Interactivo:** Sistema dinámico con "Me gusta", comentarios anidados (threaded replies) y funcionalidad de compartir (reposts).
* **Sistema de seguimiento:** Gestión de seguidores y seguidos, el usuario sólo ve los posts de los usuarios que sigue.
* **Contenido Efímero (Historias):** Sistema de historias (texto e imagen) con caducidad de 24 horas, automatizado mediante **Cron Jobs** en el servidor.
* **Búsqueda Avanzada:** Motor de filtrado de los posts por hashtags, títulos y descripciones, así como búsquea de perfiles de usuario por nombre o username.
* **Diseño Mobile-First:** Interfaz adaptativa construida con **Shadcn UI** y **Tailwind CSS**, garantizando una experiencia fluida en cualquier dispositivo.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías |
| :--- | :--- |
| **Frontend** | React.js, TypeScript, Zustand (Gestión de estado) |
| **UI / Estilos** | Tailwind CSS, Shadcn UI, Lucide Icons, React Icons |
| **Backend** | Node.js, Express.js, Socket.io |
| **Base de Datos** | MongoDB & Mongoose (NoSQL) |
| **Seguridad** | Clerk Auth, Web Crypto API |
| **Infraestructura** | ImageKit (Almacenamiento de archivos), Vercel (Frontend), Render (Backend) |

---

## 📸 Demo Visual

### Interfaz de Usuario
![Feed principal](https://mir-s3-cdn-cf.behance.net/project_modules/fs_webp/1ad92b242284039.6969a806a4980.jpg)

### Mensajería Encriptada y Multimedia
![Chat cifrado](https://mir-s3-cdn-cf.behance.net/project_modules/fs_webp/81b09b242284039.6969a806a257c.jpg)

![Chat cifrado](https://mir-s3-cdn-cf.behance.net/project_modules/fs_webp/f0f6f2242284039.6969a806a43e2.jpg)

![Chat cifrado](https://mir-s3-cdn-cf.behance.net/project_modules/fs_webp/33391f242284039.6969a806a3cad.jpg)

![Chat cifrado](https://mir-s3-cdn-cf.behance.net/project_modules/fs_webp/5e4c4d242284039.6969a806a5475.png)

### Perfil y Gestión de Cuenta
![Perfil del usuario](https://mir-s3-cdn-cf.behance.net/project_modules/fs_webp/d14cb5242284039.6969a806a6a34.png)
![Perfil del usuario](https://mir-s3-cdn-cf.behance.net/project_modules/fs_webp/294bd3242284039.6969a806a37c0.jpg)

---

## ⚙️ Desafíos Técnicos y Soluciones

1.  **Criptografía en el Cliente:** Implementar el cifrado E2EE requirió asegurar que el intercambio de llaves fuera seguro y transparente para el usuario, manteniendo el rendimiento de la aplicación.
2.  **Infraestructura Real-Time Nativa:** Al optar por **Socket.io** sobre soluciones pagas, diseñé una lógica de "rooms" y estados de conexión que maneja eficientemente múltiples chats simultáneos.
3.  **Automatización de Datos:** La eliminación automática de historias a las 24 horas se realiza mediante **Cron Jobs** que interactúan con la base de datos y la API de **ImageKit** para liberar almacenamiento.
4.  **Gestión de Estado Ligera:** Se eligió **Zustand** sobre Redux por su simplicidad y bajo boilerplate.

---

## 🎯 Objetivo de este Proyecto
Este proyecto fue diseñado como una pieza central de mi portafolio para demostrar habilidades en:
* Arquitectura de aplicaciones **Full-Stack** modernas.
* Manejo de protocolos de seguridad y privacidad de datos.
* Desarrollo de funcionalidades en tiempo real sin dependencias externas.
* Creación de interfaces de usuario profesionales, accesibles y altamente responsivas.

---

## 📧 Contacto

* **GitHub:** [https://github.com/guzzz-12]
* **Portafolio:** [https://gzmn.vercel.app]
* **Email:** [jegq.dev.projects@gmail.com]
* **Behance:** [https://www.behance.net/guzzz_12]

---