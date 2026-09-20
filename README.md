# Organizer 📱

> **PWA de planificación personal y gestión de tiempo**, diseñada específicamente para iPhone con enfoque en recuperar información mediante notificaciones inteligentes y captura sin fricción.

---

## ⚡ Stack Tecnológico

- **Frontend & Backend**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack) + TypeScript estricto.
- **Estilos**: [Tailwind CSS 4](https://tailwindcss.com/) con sistema de diseño basado en CSS variables (`tokens.css`, `base.css`).
- **Base de Datos & Auth**: [Supabase](https://supabase.com/) (PostgreSQL con Row Level Security, autenticación por Google OAuth / Magic Link).
- **Notificaciones**: Web Push estándar (VAPID) disparadas vía `pg_cron` + `pg_net` + Supabase Edge Functions.
- **Captura rápida**: Integración con Atajos de iOS (Siri) vía `POST /api/capture`.

---

## 📂 Estructura del Repositorio

```text
Organizer/
├── web/                  # La aplicación web Next.js completa
│   ├── src/
│   │   ├── app/          # Rutas del App Router (calendario, tareas, auth, api, etc.)
│   │   ├── components/   # Componentes modulares de UI (vistas de día, semana, mes, etc.)
│   │   ├── lib/          # Clientes Supabase, utilidades de fecha, helpers de push
│   │   ├── styles/       # tokens.css, base.css y estilos de la web
│   │   └── proxy.ts      # Proxy de protección de rutas y refresco de sesión
│   └── .env.local.example
├── app/                  # Sistema de diseño original y prototipo interactivo en HTML
│   ├── tokens.css        # Fuente de verdad del sistema de tokens (colores, espacios, etc.)
│   ├── base.css          # Estilos base y utilidades táctiles (44px)
│   └── icons.js          # Definiciones de iconos SVG
├── supabase/             # Backend serverless y extensiones de base de datos
│   ├── cron.sql          # Configuración del cron para el despacho de notificaciones
│   ├── functions/        # Supabase Edge Function (dispatch-notifications)
│   └── run-dispatch.mjs  # Script local para depurar y previsualizar notificaciones
├── docs/                 # Documentación técnica, modelo de datos y registro de decisiones
│   ├── schema.sql        # Esquema completo de base de datos con RLS y disparadores
│   ├── 00-problema.md    # Diagnóstico del problema y fundamentos del producto
│   ├── 01-decisiones.md  # Registro de decisiones arquitectónicas y de diseño
│   └── 02-arquitectura.md# Arquitectura general y especificaciones técnicas
└── briefs/               # Requisitos y encargos técnicos de cada fase de desarrollo
```

---

## 🚀 Inicio Rápido (Local)

### 1. Prerrequisitos

- **Node.js**: v20 o superior (recomendado v20.x o v24.x).
- **npm**: v10 o superior.
- Una instancia de proyecto en [Supabase](https://supabase.com).

### 2. Clonar e Instalar Dependencias

```bash
git clone <URL_DEL_REPOSITORIO>
cd Organizer

# Instalar dependencias en el paquete web
npm --prefix web install
# O si prefieres entrar directamente a la carpeta:
# cd web && npm install
```

### 3. Configurar Variables de Entorno

Copia la plantilla de variables dentro de la carpeta `web/`:

```bash
cp web/.env.local.example web/.env.local
```

Abre `web/.env.local` y completa al menos las claves básicas de Supabase:

```env
# URL de tu proyecto en Supabase (Project Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co

# Clave pública 'anon' (Project Settings → API)
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...

# Clave secreta 'service_role' (Project Settings → API Keys)
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

> ⚠️ **Seguridad:** `SUPABASE_SERVICE_ROLE_KEY` **NUNCA** debe commitearse a Git ni exponerse en el cliente. `.gitignore` protege automáticamente los archivos `.env*`.

### 4. Levantar el Servidor de Desarrollo

Desde la raíz del proyecto:

```bash
npm run dev
```

O para exponerlo en tu red local y probar desde un iPhone / teléfono:

```bash
npm --prefix web run dev -- -H 0.0.0.0
```

Abre en tu navegador:
- En tu PC: `http://localhost:3000`
- Desde tu teléfono (en la misma red Wi-Fi): `http://<IP_LOCAL_DE_TU_PC>:3000`

---

## 🛠️ Configuración de Supabase

1. **Esquema de Base de Datos**:
   Copia el contenido de [`docs/schema.sql`](docs/schema.sql) y ejecútalo en el **SQL Editor** de tu panel de Supabase. Esto creará las tablas, índices, políticas RLS y disparadores de auditoría.
2. **URL Configuration (Auth)**:
   En Supabase → **Authentication** → **URL Configuration**:
   - **Site URL**: `http://localhost:3000` (o la URL de tu despliegue en Vercel).
   - **Redirect URLs**: Añade:
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3000/**`
     - Y la IP de tu teléfono en caso de desarrollo local: `http://<IP_LOCAL>:<PUERTO>/auth/callback`

---

## 🔐 Autenticación y Colaboradores

La aplicación utiliza **Supabase Auth** con `@supabase/ssr` y maneja dos métodos en `/entrar`:

1. **Google OAuth (Método principal)**:
   - Inicio de sesión con 1 toque.
   - Al tocar *"Entrar con Google"*, el navegador viaja a Google, valida la cuenta y redirige a `/auth/callback`.
   - El servidor intercambia el código por cookies de sesión y crea automáticamente su perfil en `profiles` con la zona horaria predeterminada (`America/Caracas`).
2. **Enlace al correo / Magic Link (Salida de emergencia)**:
   - Si Google falla o no está disponible, el usuario ingresa su correo y recibe un enlace de un solo uso válido por 1 hora.

### ¿Cómo entra un compañero de equipo?

- **¿Puede entrar con su propio correo o cuenta de Google?**
  **Sí, totalmente.** Supabase registrará su cuenta en `auth.users` y creará su fila en `profiles`.
- **Aislamiento total de datos (Row Level Security - RLS):**
  La base de datos tiene RLS activo en **todas** las tablas (`items`, `blocks`, `contexts`, `resources`, etc.). Cada consulta filtra estrictamente por `auth.uid()`.
  Esto significa que **tu compañero NUNCA verá tus tareas, materias ni notas**, y tú no verás las suyas, incluso si ambos comparten la misma instancia de Supabase en desarrollo.
- **Opción de base de datos propia:**
  Si el colaborador prefiere trabajar en un entorno totalmente aislado, solo necesita crear un proyecto gratis en Supabase, ejecutar [`docs/schema.sql`](docs/schema.sql) en el SQL Editor y colocar sus propias variables en `web/.env.local`.
- **Requisito para que no le falle el login local:**
  Asegurarse de que el puerto o la IP desde donde corre la app esté agregada en **Redirect URLs** en el panel de Supabase (por ejemplo, `http://localhost:3000/**`).

---

## 📋 Comandos Disponibles

Desde la raíz del repositorio puedes ejecutar:

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia Next.js en modo desarrollo con Turbopack |
| `npm run build` | Compila la aplicación para producción |
| `npm run start` | Inicia el servidor Next.js compilado |
| `npm run lint` | Ejecuta ESLint sobre el código |
| `npm run verify` | **Pipeline de validación integral**: chequeo de tokens de diseño, ESLint, TypeScript en web, TypeScript en Supabase Functions, tests unitarios de notificaciones y build de Next.js |

---

## 🔔 Notificaciones & Edge Functions

Para probar y validar las notificaciones Web Push:

1. **Tests unitarios:**
   ```bash
   npm --prefix web run test:push
   ```
2. **Previsualizador de notificaciones locales:**
   ```bash
   node supabase/run-dispatch.mjs preview
   ```
3. **Despliegue del cron de notificaciones:**
   Revisa las instrucciones en [`supabase/cron.sql`](supabase/cron.sql).

---

## 🗺️ Estado del Proyecto & Tareas Pendientes

Para ver en detalle qué está integrado, qué detalles visuales y de UX están pendientes, y la hoja de ruta para colaboradores, consulta:

👉 **[`docs/PENDIENTES.md`](docs/PENDIENTES.md)**

---

## 📌 Reglas de Contribución

- **Tokens de diseño**: `app/tokens.css` es la fuente de verdad. Si modificas tokens, actualiza ambos (`app/tokens.css` y `web/src/styles/tokens.css`). `npm run verify` fallará si difieren.
- **Accesibilidad táctil**: Todo botón o elemento interactivo debe respetar el mínimo táctil de iOS de **44px** (`.btn`, `.tapicon`, etc.).
- **Idioma**: La interfaz de usuario y la documentación van en **español**; el código, nombres de variables y tablas en **inglés**.
- **Verificación**: Antes de abrir un PR o hacer push a `main`, ejecuta siempre:
  ```bash
  npm run verify
  ```
