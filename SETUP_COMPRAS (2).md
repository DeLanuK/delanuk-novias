# DELANUK · Sección COMPRAS — Activación (5 minutos)

Esta sección nueva permite **registrar las facturas de tus proveedores**: sacás foto,
cargás proveedor + monto + fecha, marcás si está pagada, y queda todo guardado.

Para que funcione hay que crear **una tabla** en Supabase (una sola vez). Es gratis y rápido.

---

## Paso único — Crear la tabla en Supabase

1. Entrá a **supabase.com** e ingresá con tu cuenta (la misma del sistema de novias).
2. Abrí el proyecto de DELANUK.
3. En el menú de la izquierda, entrá a **SQL Editor**.
4. Click en **"New query"**.
5. Pegá **todo** este código y apretá **RUN** (botón verde, abajo a la derecha):

```sql
-- Tabla de compras (facturas de proveedores)
create table if not exists compras (
  id           bigserial primary key,
  proveedor    text not null,
  fecha        date,
  nro_factura  text,
  monto        numeric(14,2) default 0,
  pagado       boolean default false,
  foto         text,                 -- comprobante (foto comprimida)
  items        jsonb default '[]'::jsonb,  -- para la futura planilla de costeo
  notas        text,
  created_at   timestamptz default now()
);

-- Seguridad: solo usuarios logueados pueden ver/editar
alter table compras enable row level security;

drop policy if exists "compras_auth_all" on compras;
create policy "compras_auth_all" on compras
  for all
  to authenticated
  using (true)
  with check (true);
```

6. Si ves el mensaje **"Success. No rows returned"**, ¡listo! La tabla ya está creada.

---

## ¿Y ahora?

- Entrá a la app → menú **Compras** → **"+ Nueva factura"**.
- Sacale foto a un comprobante (o cargá sin foto), elegí el proveedor, el monto y la fecha.
- La primera vez la lista de proveedores está vacía: escribí uno en **"Otro proveedor (nuevo)"**
  y a partir de ahí queda como botón rápido para las próximas.

---

## Notas

- **No hay ningún costo.** Todo se guarda en tu Supabase (plan gratuito).
- Las fotos se **comprimen** en el celular antes de guardarse, para no ocupar lugar de más.
- Esta es la **Fase 1**. Más adelante, sobre esta misma tabla, sumamos:
  - detalle de **insumos** por factura y su **precio**,
  - **historial de precios** y variación en el tiempo vs. inflación,
  - **planilla de costeo** de cada producto,
  - **órdenes de pago**.

Cualquier duda, traé las preguntas a Claude y lo resolvemos paso a paso.
