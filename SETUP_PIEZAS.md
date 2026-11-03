# DELANUK · Catálogo de PIEZAS — Activación (5 minutos)

Esta sección guarda **cada pieza que presupuestás** (rosarios, tocados, aros…) con su
**costo** y su **precio**, para que la próxima vez que aparezca una parecida la tengas a mano
y no tengas que costearla de nuevo.

Funciona en tres lugares:

1. **Al generar un presupuesto**: cuando escribís el nombre de una pieza, te sugiere las que ya
   presupuestaste antes (con precio, costo, para quién y cuándo). Tocás una y se completa.
   Al apretar **"Guardar en la ficha"**, las piezas se registran solas en el catálogo.
2. **Menú "Piezas"** de la app: buscador, listado con costo/precio/margen y edición.
3. **Importación del histórico**: todo lo que ya presupuestaste hasta hoy se carga al catálogo
   automáticamente con el script de abajo.

Para que funcione hay que correr **un script** en Supabase (una sola vez).

---

## Paso único — Crear la tabla e importar el histórico

1. Entrá a **supabase.com** → proyecto **DeLanuK Novias**.
2. Menú de la izquierda → **SQL Editor** → **New query**.
3. Pegá **todo** este código y apretá **RUN**:

```sql
-- ============================================================
-- 1) Tabla del catálogo de piezas
-- ============================================================
create table if not exists piezas_catalogo (
  id            bigserial primary key,
  nombre        text not null,                 -- descripción de la pieza (tal como va al presupuesto)
  nombre_key    text generated always as (lower(btrim(regexp_replace(nombre, '\s+', ' ', 'g')))) stored,
  categoria     text default 'Otro',           -- Rosario, Tocado, Aros, Collar, Pulsera, Tiara, Anillo, Otro
  descripcion   text,                          -- detalle: medidas, piedra, baño, etc.
  costo         numeric(14,2) default 0,       -- costo total (de la planilla de costeo)
  precio        numeric(14,2) default 0,       -- precio pasado a la novia
  notas         text,
  foto          text,                          -- foto comprimida (opcional, a futuro)
  novia_id      bigint,                        -- última novia a la que se le presupuestó
  novia_nombre  text,
  fecha         date default current_date,     -- fecha del último presupuesto
  veces         integer default 1,             -- cuántas veces se presupuestó
  activo        boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Un mismo nombre (sin importar mayúsculas/espacios) = una sola pieza
create unique index if not exists piezas_catalogo_nombre_key_uq on piezas_catalogo (nombre_key);

-- Seguridad: solo usuarios logueados
alter table piezas_catalogo enable row level security;
drop policy if exists "piezas_auth_all" on piezas_catalogo;
create policy "piezas_auth_all" on piezas_catalogo
  for all to authenticated using (true) with check (true);

-- updated_at automático
create or replace function piezas_set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_piezas_updated_at on piezas_catalogo;
create trigger trg_piezas_updated_at before update on piezas_catalogo
  for each row execute function piezas_set_updated_at();

-- ============================================================
-- 2) Categoría automática a partir del nombre
-- ============================================================
create or replace function pieza_categoria_auto(p_nombre text) returns text
language sql immutable as $$
  select case
    when p_nombre ~* 'rosario'                       then 'Rosario'
    when p_nombre ~* 'tocado|peineta|peinet'         then 'Tocado'
    when p_nombre ~* 'tiara|corona|vincha'           then 'Tiara'
    when p_nombre ~* '\maro|aros|argolla|pendiente'  then 'Aros'
    when p_nombre ~* 'collar|gargantilla|cadena|choker' then 'Collar'
    when p_nombre ~* 'pulsera|brazalete'             then 'Pulsera'
    when p_nombre ~* 'anillo|alianza'                then 'Anillo'
    when p_nombre ~* 'tobillera'                     then 'Tobillera'
    when p_nombre ~* 'prendedor|broche|\mpin\M'          then 'Prendedor'
    else 'Otro' end
$$;

-- ============================================================
-- 3) Función que usa el presupuesto para registrar piezas
--    (si ya existe → actualiza precio/costo y suma 1; si no → la crea)
-- ============================================================
create or replace function registrar_piezas(
  p_items jsonb,            -- [{"desc":"Rosario perlas 60cm","precio":85000,"costo":30000}, ...]
  p_novia_id bigint default null,
  p_novia_nombre text default null
) returns integer
language plpgsql security invoker as $$
declare
  it jsonb;
  v_nombre text;
  v_precio numeric;
  v_costo numeric;
  n integer := 0;
begin
  for it in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    v_nombre := btrim(coalesce(it->>'desc', ''));
    if v_nombre = '' then continue; end if;
    v_precio := coalesce(nullif(it->>'precio','')::numeric, 0);
    v_costo  := nullif(it->>'costo','')::numeric;

    insert into piezas_catalogo (nombre, categoria, costo, precio, novia_id, novia_nombre, fecha, veces)
    values (v_nombre, pieza_categoria_auto(v_nombre), coalesce(v_costo, 0), v_precio, p_novia_id, p_novia_nombre, current_date, 1)
    on conflict (nombre_key) do update set
      precio       = case when excluded.precio > 0 then excluded.precio else piezas_catalogo.precio end,
      costo        = case when v_costo is not null and v_costo > 0 then v_costo else piezas_catalogo.costo end,
      novia_id     = coalesce(excluded.novia_id, piezas_catalogo.novia_id),
      novia_nombre = coalesce(excluded.novia_nombre, piezas_catalogo.novia_nombre),
      fecha        = current_date,
      activo       = true,
      -- solo suma una vez por novia (si volvés a guardar el mismo presupuesto no cuenta doble)
      veces        = case when piezas_catalogo.novia_id is distinct from excluded.novia_id
                          then piezas_catalogo.veces + 1 else piezas_catalogo.veces end;
    n := n + 1;
  end loop;
  return n;
end $$;

grant execute on function registrar_piezas(jsonb, bigint, text) to authenticated;

-- ============================================================
-- 4) IMPORTAR EL HISTÓRICO desde las fichas de las novias
--    (todas las piezas ya presupuestadas, agrupadas por nombre)
-- ============================================================
insert into piezas_catalogo (nombre, categoria, precio, costo, novia_id, novia_nombre, fecha, veces, created_at)
select
  x.nombre,
  pieza_categoria_auto(x.nombre),
  x.precio,
  0,
  x.novia_id,
  x.novia_nombre,
  x.fecha,
  x.veces,
  x.primera
from (
  select distinct on (lower(btrim(regexp_replace(it->>'desc', '\s+', ' ', 'g'))))
    btrim(it->>'desc')                                   as nombre,
    coalesce(nullif(it->>'precio','')::numeric, 0)       as precio,
    nv.id                                                as novia_id,
    nv.nombre                                            as novia_nombre,
    coalesce(nv.created_at::date, current_date)          as fecha,
    count(*) over (partition by lower(btrim(regexp_replace(it->>'desc', '\s+', ' ', 'g')))) as veces,
    min(nv.created_at) over (partition by lower(btrim(regexp_replace(it->>'desc', '\s+', ' ', 'g')))) as primera
  from novias nv
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(nv.presupuesto) = 'array' then nv.presupuesto else '[]'::jsonb end
  ) as it
  where btrim(coalesce(it->>'desc','')) <> ''
  order by lower(btrim(regexp_replace(it->>'desc', '\s+', ' ', 'g'))), nv.created_at desc nulls last, nv.id desc
) x
on conflict (nombre_key) do nothing;

-- Resultado: cuántas piezas quedaron en el catálogo
select count(*) as piezas_importadas from piezas_catalogo;
```

4. Abajo tiene que aparecer una tabla con **`piezas_importadas`** y un número: esa es la cantidad
   de piezas distintas que ya tenías presupuestadas y que ahora están en el catálogo.

> Si te da error "relation novias does not exist" o similar, avisale a Claude. Si te da
> "already exists", es porque ya lo corriste: no pasa nada, podés seguir.

---

## ¿Y ahora?

- Entrá a la app → menú **Piezas**. Vas a ver todo el histórico importado. El **costo** viene en 0
  porque las fichas no lo tenían: cargalo a medida que lo vayas necesitando (botón **Editar**).
- Abrí el presupuesto de cualquier novia y empezá a escribir una pieza: te van a aparecer las
  sugerencias. Cada fila ahora tiene también un campo **Costo** (opcional, no se imprime).
- Al **Guardar en la ficha**, las piezas nuevas se suman solas al catálogo.

---

## Notas

- El catálogo agrupa por **nombre exacto** (sin distinguir mayúsculas ni espacios de más). Si
  escribís "Rosario perlas 60 cm" y después "Rosario de perlas 60cm", son dos piezas distintas.
  Conviene elegir una pieza sugerida y ajustarle lo que cambia en lugar de escribirla de cero.
- Podés borrar o desactivar piezas desde la app sin que afecte los presupuestos ya guardados en
  las fichas.
- No tiene costo: todo queda en tu Supabase.
