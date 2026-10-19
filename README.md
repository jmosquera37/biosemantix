# BioSemantix

BioSemantix es un **diccionario de genes**: permite buscar genes por símbolo,
identificador Ensembl o accesión UniProt y consultar sus anotaciones
funcionales a partir de fuentes públicas (Ensembl y UniProt).

La aplicación tiene **dos partes independientes**:

| Parte | Tecnología | Qué es |
| --- | --- | --- |
| Frontend | React + TypeScript + Vite (SPA/PWA) | Interfaz de usuario. Se despliega como sitio estático. |
| Backend | FastAPI (Python) | Servicio HTTP que consulta Ensembl/UniProt y devuelve el contrato JSON. |

> BioSemantix **no** es una plataforma de expresión diferencial ni de
> enriquecimiento (ORA). El backend expone únicamente consultas de genes y
> proteínas.

---

## 1. Requisitos previos

- **Node.js 20+** y **npm** (el proyecto usa Vite 8; el `Dockerfile` usa Node 24).
- **Python 3.10+** (el backend usa anotaciones modernas de tipos). El
  `requirements.txt` del backend declara: `fastapi`, `uvicorn[standard]`, `httpx`.
- **Git**.
- Acceso de red saliente a **Ensembl** y **UniProt** desde el backend.
- Para el despliegue: una cuenta en **Vercel** (frontend) y un **servicio de
  alojamiento HTTPS** para el backend (por ejemplo un PaaS que ejecute
  contenedores o procesos Python).

---

## 2. Desarrollo local

### 2.1 Frontend

```bash
npm install
npm run dev
```

Se sirve por defecto en `http://localhost:5173`.

Otros comandos útiles:

```bash
npm run build   # compilación de producción (tsc -b && vite build) -> dist/
npm run preview # sirve localmente la compilación de dist/
npm test        # pruebas del frontend (vitest)
npm run lint    # oxlint
```

### 2.2 Backend

Desde la carpeta `backend/`:

```bash
cd backend
python -m venv .venv

# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Linux / macOS:
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

El backend queda en `http://127.0.0.1:8000`.

> Alternativa: desde la raíz del repositorio puedes ejecutar
> `uvicorn backend.main:app --reload --port 8000`.

Endpoints disponibles:

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/` | Comprobación de estado del backend. |
| GET | `/api/genes/{identifier}` | Gen por símbolo, ID Ensembl o accesión UniProt. |
| GET | `/api/proteins/{symbol}` | Proteína (UniProt) para un símbolo. |

### 2.3 Pruebas del backend

No dependen de que Ensembl o UniProt estén disponibles (las fuentes se simulan
con dobles y `httpx.MockTransport`). Desde `backend/`:

```bash
python -m unittest test_main test_enrichment
```

---

## 3. Variables de entorno

Copia `.env.example` como referencia (`cp .env.example .env` en Linux/macOS) y
ajusta los valores. **No subas nunca tu `.env` al repositorio** (ya está
ignorado por `.gitignore`).

### 3.1 `VITE_API_BASE_URL` (frontend)

- **Qué es:** URL base del backend que usa el frontend en todas sus llamadas.
- **Valor por defecto:** si no se define, `http://127.0.0.1:8000` (útil en local).
- **Cuándo usarla:** siempre que el frontend y el backend no estén en la misma
  máquina/puerto, es decir, en cualquier despliegue. Debe ser la URL **HTTPS**
  del backend.
- **Nota importante (Vite):** solo las variables con prefijo `VITE_` llegan al
  navegador. El valor **se incrusta en el bundle durante la compilación**, por lo
  que **cambiarlo exige volver a compilar y desplegar** (ver sección 5).

Ejemplo:

```env
VITE_API_BASE_URL=https://<url-https-del-backend>
```

### 3.2 `CORS_ALLOW_ORIGINS` (backend)

- **Qué es:** lista de orígenes (esquema + dominio) autorizados a llamar al
  backend, separados por comas.
- **Valor por defecto:** si se omite o queda vacía, se conservan los cuatro
  orígenes locales de desarrollo:
  `http://localhost:5173`, `http://127.0.0.1:5173`,
  `http://localhost:5174`, `http://127.0.0.1:5174`.
- **Cuándo usarla:** en producción, para autorizar **el dominio real del
  frontend en Vercel**. El comodín `*` **no se admite** (se descarta).
- Es la variable que debes usar para el **dominio de producción** (estable).

Ejemplo:

```env
CORS_ALLOW_ORIGINS=https://<tu-dominio>.vercel.app
```

### 3.3 `CORS_ALLOW_ORIGIN_REGEX` (backend, opcional)

- **Qué es:** expresión regular que autoriza orígenes que coincidan, además de
  los de `CORS_ALLOW_ORIGINS`.
- **Valor por defecto:** desactivada (no se acepta ningún origen por patrón).
- **Cuándo usarla:** **solo** si necesitas que funcionen los *previews* de
  Vercel, cuyas URLs cambian en cada despliegue. Acótala al prefijo del proyecto
  para **no aceptar dominios arbitrarios**; no uses un patrón que termine en
  `vercel.app` sin más.

Ejemplo (ajusta `<proyecto>` al nombre real):

```env
CORS_ALLOW_ORIGIN_REGEX=^https://<proyecto>-[a-z0-9-]+\.vercel\.app$
```

> Regla práctica: si solo tienes un dominio fijo, usa **solo**
> `CORS_ALLOW_ORIGINS`. Añade `CORS_ALLOW_ORIGIN_REGEX` únicamente cuando
> quieras cubrir los previews.

---

## 4. Despliegue

### 4.1 Frontend en Vercel

1. Importa el repositorio en Vercel. El preset de **Vite** se detecta
   automáticamente.
2. El proyecto incluye `vercel.json` con:
   - `buildCommand`: `npm run build`
   - `outputDirectory`: `dist`
   - una reescritura SPA (`/(.*)` → `/index.html`) para que las rutas de React
     Router funcionen al recargar; los archivos estáticos existentes (assets,
     service worker, manifest) se sirven directamente.
3. En **Settings → Environment Variables** del proyecto, define
   `VITE_API_BASE_URL` con la URL HTTPS del backend.
4. Despliega. Cada cambio de `VITE_API_BASE_URL` requiere **redeploy**.

### 4.2 Backend FastAPI en un servicio HTTPS independiente

El backend debe alojarse aparte del frontend, con estas condiciones:

- **HTTPS obligatorio.** Vercel sirve el frontend por HTTPS; si el backend
  estuviera en HTTP, el navegador bloquearía las peticiones por **contenido
  mixto**. Usa el dominio HTTPS que te proporcione tu proveedor.
- **Proceso Python** que ejecute la app ASGI, por ejemplo:
  `uvicorn main:app --host 0.0.0.0 --port $PORT` (muchos PaaS inyectan el puerto
  por la variable `PORT`).
- **Red saliente** habilitada hacia `ensembl.org` y `uniprot.org`.
- **Solo peticiones GET** (el contrato actual no necesita más).
- **CORS configurado** con el dominio del frontend (sección 4.3).

### 4.3 Variables de entorno en cada servicio

| Servicio | Variable | Valor |
| --- | --- | --- |
| Vercel (frontend) | `VITE_API_BASE_URL` | URL HTTPS del backend |
| Backend (host HTTPS) | `CORS_ALLOW_ORIGINS` | Dominio del frontend en Vercel |
| Backend (host HTTPS) | `CORS_ALLOW_ORIGIN_REGEX` | *(opcional)* patrón de previews de Vercel |

---

## 5. Verificación final

Sustituye `<backend>` por la URL HTTPS real del backend y `<frontend>` por el
dominio real del frontend. En Windows/PowerShell usa `curl.exe`.

1. **Estado del backend**

   ```bash
   curl.exe <backend>/
   # Esperado: {"message":"BioSemantix API funcionando"}
   ```

   En la interfaz, abre **Configuración**: el indicador debe mostrar
   **«Backend — Conectado»**.

2. **Consulta de un gen**

   ```bash
   curl.exe <backend>/api/genes/BRCA1
   # Esperado: JSON con "status": "ok" y datos de Ensembl/UniProt
   ```

   En la interfaz, busca `BRCA1` y comprueba que se muestran las anotaciones.

3. **Comprobación de CORS**

   ```bash
   curl.exe -i -X OPTIONS <backend>/api/genes/BRCA1 ^
     -H "Origin: <frontend>" ^
     -H "Access-Control-Request-Method: GET"
   # Esperado: cabecera "access-control-allow-origin: <frontend>"
   ```

   Con un origen **no** autorizado, esa cabecera **no** debe aparecer.

4. **Nota sobre `VITE_API_BASE_URL`:** al ser una variable de compilación, **un
   cambio en su valor no se aplica hasta recompilar y volver a desplegar** el
   frontend. No basta con editarla en tiempo de ejecución.

---

## 6. Docker (frontend)

El `Dockerfile` construye la SPA y la sirve con Nginx:

```bash
docker build -t biosemantix .
docker run -p 8080:80 biosemantix
```

La app queda en `http://localhost:8080`.

- El `Dockerfile` **no define `VITE_API_BASE_URL`**. Si no se proporciona
  durante la compilación, el bundle usará el valor por defecto
  (`http://127.0.0.1:8000`).
- Para que la imagen apunte a un backend real, crea un archivo `.env` con
  `VITE_API_BASE_URL=<url-https-del-backend>` **antes** de ejecutar
  `docker build` (el `.dockerignore` no excluye `.env`, de modo que se copia e
  incrusta en el bundle). No incluyas secretos en ese archivo.

---

## 7. Plantilla original de Vite (contenido conservado)

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

### React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

### Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
