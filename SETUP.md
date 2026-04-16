# DELANUK · Sistema Novias — Guía de Setup

## ¿Qué es esto?
Una app web que vive en internet con un link fijo. El equipo entra desde el celular o la
computadora, agrega novias, actualiza estados y tilda etapas. Los datos quedan guardados.

---

## Lo que necesitás (todo gratis)

| Servicio | Para qué | Costo |
|----------|----------|-------|
| **Vercel** (vercel.com) | Donde vive la app (el link) | Gratis |
| **GitHub** (github.com) | Guardar el código | Gratis |

> ¿Querés que los datos persistan entre sesiones? En la versión básica los datos
> se guardan en el navegador (localStorage). Para una base de datos compartida
> entre todo el equipo, hay que agregar Supabase — ver Paso 4 opcional.

---

## Paso 1 — Crear cuenta en GitHub

1. Ir a github.com → Sign up
2. Crear cuenta gratuita

---

## Paso 2 — Subir el código

1. En GitHub, click en **"New repository"**
2. Nombre: `delanuk-novias`
3. Click en **"Add file" → "Upload files"**
4. Arrastrar los 3 archivos: `index.html`, `style.css`, `app.js`
5. Click en **"Commit changes"**

---

## Paso 3 — Deploy en Vercel

1. Ir a vercel.com → Sign up con la cuenta de GitHub
2. Click en **"Add New Project"**
3. Seleccionar el repositorio `delanuk-novias`
4. Click en **"Deploy"** (sin cambiar nada)
5. En ~1 minuto te da un link: `delanuk-novias.vercel.app`

¡Listo! Ese link es la app. Lo compartís con el equipo y ya.

---

## Paso 4 (opcional) — Base de datos compartida

Si querés que los datos que carga una persona los vea otra en tiempo real,
hay que conectar Supabase:

1. Ir a supabase.com → crear cuenta gratis
2. Crear un proyecto nuevo
3. Ir a **SQL Editor** y pegar este código:

```sql
create table novias (
  id serial primary key,
  nombre text not null,
  fecha text,
  tel text,
  ig text,
  ciudad text,
  tipo text,
  rol text,
  resp text,
  estado text default 'Pendiente',
  total integer default 0,
  sena integer default 0,
  fsena text,
  piezas text,
  notas text,
  checklist jsonb,
  created_at timestamp default now()
);
```

4. En Supabase → Settings → API → copiar:
   - `Project URL`
   - `anon public key`

5. En `app.js`, al principio del archivo, reemplazar:
```js
// SUPABASE CONFIG (descomentar y completar)
// const SUPABASE_URL = 'https://xxxxx.supabase.co'
// const SUPABASE_KEY = 'eyJ...'
```

---

## Actualizar el sistema

Cuando quieran cambiar algo (agregar un campo, cambiar un color, etc.):
1. Editar el archivo en GitHub directamente
2. Vercel detecta el cambio y actualiza la app automáticamente en ~30 segundos

---

## Soporte

Cualquier duda, traer las preguntas a Claude y se resuelven paso a paso.
