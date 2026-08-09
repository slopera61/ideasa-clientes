create extension if not exists pgcrypto;

-- OTP de clientes
create table if not exists cliente_codigos_acceso (
  id uuid primary key default gen_random_uuid(),
  cod_cliente integer not null,
  documento text not null,
  email_destino text not null,
  otp_hash text not null,
  vence_en timestamptz not null,
  intentos integer not null default 0,
  usado boolean not null default false,
  usado_en timestamptz,
  ip_origen text,
  user_agent text,
  creado_en timestamptz not null default now()
);

create index if not exists idx_cliente_codigos_acceso_documento
  on cliente_codigos_acceso (documento, creado_en desc);

-- OTP de admins
create table if not exists admin_codigos_acceso (
  id uuid primary key default gen_random_uuid(),
  cod_vendedor integer not null,
  email_destino text not null,
  otp_hash text not null,
  vence_en timestamptz not null,
  intentos integer not null default 0,
  usado boolean not null default false,
  usado_en timestamptz,
  ip_origen text,
  user_agent text,
  creado_en timestamptz not null default now()
);

create index if not exists idx_admin_codigos_acceso_email
  on admin_codigos_acceso (email_destino, creado_en desc);

-- Solicitudes de perfil
create table if not exists solicitudes_actualizacion_cliente (
  id uuid primary key default gen_random_uuid(),
  cod_cliente integer not null,
  tipo text not null,
  estado text not null default 'pendiente',
  datos_actuales jsonb,
  datos_solicitados jsonb not null default '{}'::jsonb,
  mensaje text,
  revisado_por text,
  respuesta_interna text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists idx_solicitudes_actualizacion_cliente_cod_cliente
  on solicitudes_actualizacion_cliente (cod_cliente, creado_en desc);

-- Solicitudes de facturas
create table if not exists solicitudes_factura (
  id uuid primary key default gen_random_uuid(),
  cod_cliente integer not null,
  empresa text not null,
  serie text,
  numero text not null,
  tipo text not null,
  estado text not null default 'pendiente',
  mensaje text not null,
  soportes jsonb not null default '[]'::jsonb,
  revisado_por text,
  respuesta_interna text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists idx_solicitudes_factura_cod_cliente
  on solicitudes_factura (cod_cliente, creado_en desc);

create index if not exists idx_solicitudes_factura_empresa
  on solicitudes_factura (empresa, numero);

-- Orden maestra. Se crea antes de redirigir al checkout.
create table if not exists ordenes_pago (
  id uuid primary key default gen_random_uuid(),
  cod_cliente integer not null,
  documento text,
  referencia text not null unique,
  proveedor_preferido text,
  total_centavos integer not null,
  moneda text not null default 'COP',
  estado text not null default 'creada',
  checkout_url text,
  datos_cliente jsonb not null default '{}'::jsonb,
  metadatos jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint chk_ordenes_pago_total_positivo check (total_centavos > 0),
  constraint chk_ordenes_pago_estado check (
    estado in ('creada', 'checkout_iniciado', 'pago_pendiente', 'pago_confirmado', 'fallida', 'cancelada', 'expirada')
  )
);

alter table ordenes_pago add column if not exists documento text;
alter table ordenes_pago add column if not exists checkout_url text;
alter table ordenes_pago add column if not exists datos_cliente jsonb not null default '{}'::jsonb;
alter table ordenes_pago add column if not exists metadatos jsonb not null default '{}'::jsonb;

create index if not exists idx_ordenes_pago_cod_cliente
  on ordenes_pago (cod_cliente, creado_en desc);

create index if not exists idx_ordenes_pago_referencia
  on ordenes_pago (referencia);

create index if not exists idx_ordenes_pago_estado
  on ordenes_pago (estado, creado_en desc);

-- Facturas incluidas en la orden.
create table if not exists ordenes_pago_detalle (
  id uuid primary key default gen_random_uuid(),
  orden_pago_id uuid not null references ordenes_pago(id) on delete cascade,
  cod_cliente integer,
  empresa text not null,
  empresa_nombre text,
  serie text,
  numero text not null,
  importe_centavos integer not null,
  fecha_documento date,
  fecha_vencimiento date,
  edad_cartera text,
  dias_pendientes integer,
  snapshot_factura jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now(),
  constraint chk_ordenes_pago_detalle_importe_positivo check (importe_centavos > 0)
);

alter table ordenes_pago_detalle add column if not exists cod_cliente integer;
alter table ordenes_pago_detalle add column if not exists empresa_nombre text;
alter table ordenes_pago_detalle add column if not exists fecha_documento date;
alter table ordenes_pago_detalle add column if not exists edad_cartera text;
alter table ordenes_pago_detalle add column if not exists dias_pendientes integer;
alter table ordenes_pago_detalle add column if not exists snapshot_factura jsonb not null default '{}'::jsonb;

create index if not exists idx_ordenes_pago_detalle_orden
  on ordenes_pago_detalle (orden_pago_id);

create index if not exists idx_ordenes_pago_detalle_factura
  on ordenes_pago_detalle (empresa, serie, numero);

create unique index if not exists uq_ordenes_pago_detalle_factura
  on ordenes_pago_detalle (orden_pago_id, empresa, coalesce(serie, ''), numero);

-- Cada ida a una pasarela queda registrada aqui.
create table if not exists intentos_pago (
  id uuid primary key default gen_random_uuid(),
  orden_pago_id uuid not null references ordenes_pago(id) on delete cascade,
  proveedor text not null,
  referencia text not null,
  estado text not null default 'iniciado',
  checkout_url text,
  transaccion_pasarela_id text,
  request_pasarela jsonb not null default '{}'::jsonb,
  respuesta_pasarela jsonb not null default '{}'::jsonb,
  error_pasarela jsonb,
  ip_origen text,
  user_agent text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint chk_intentos_pago_estado check (
    estado in ('iniciado', 'redireccionado', 'pendiente', 'aprobado', 'rechazado', 'fallido', 'cancelado')
  )
);

alter table intentos_pago add column if not exists transaccion_pasarela_id text;
alter table intentos_pago add column if not exists request_pasarela jsonb not null default '{}'::jsonb;
alter table intentos_pago add column if not exists error_pasarela jsonb;
alter table intentos_pago add column if not exists ip_origen text;
alter table intentos_pago add column if not exists user_agent text;

create index if not exists idx_intentos_pago_orden
  on intentos_pago (orden_pago_id, creado_en desc);

create index if not exists idx_intentos_pago_referencia
  on intentos_pago (referencia, creado_en desc);

-- Pago confirmado por webhook validado. Aqui se guarda el comprobante PDF.
create table if not exists pagos (
  id uuid primary key default gen_random_uuid(),
  orden_pago_id uuid not null references ordenes_pago(id),
  cod_cliente integer not null,
  documento text,
  referencia text not null,
  proveedor text not null,
  transaccion_pasarela_id text not null,
  total_centavos integer not null,
  moneda text not null default 'COP',
  estado text not null,
  confirmado_en timestamptz,
  comprobante_numero text unique,
  comprobante_pdf_url text,
  comprobante_pdf_path text,
  comprobante_generado_en timestamptz,
  payload_pasarela jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now(),
  constraint chk_pagos_total_positivo check (total_centavos > 0),
  unique (proveedor, transaccion_pasarela_id)
);

alter table pagos add column if not exists documento text;
alter table pagos add column if not exists comprobante_numero text;
alter table pagos add column if not exists comprobante_pdf_url text;
alter table pagos add column if not exists comprobante_pdf_path text;
alter table pagos add column if not exists comprobante_generado_en timestamptz;

create unique index if not exists uq_pagos_comprobante_numero
  on pagos (comprobante_numero)
  where comprobante_numero is not null;

create index if not exists idx_pagos_cod_cliente
  on pagos (cod_cliente, confirmado_en desc);

create index if not exists idx_pagos_referencia
  on pagos (referencia);

-- Cruce entre el pago aprobado y las facturas pagadas.
create table if not exists pagos_aplicados (
  id uuid primary key default gen_random_uuid(),
  pago_id uuid not null references pagos(id) on delete cascade,
  orden_pago_detalle_id uuid references ordenes_pago_detalle(id),
  empresa text,
  serie text,
  numero text not null,
  importe_centavos integer not null,
  creado_en timestamptz not null default now()
);

create index if not exists idx_pagos_aplicados_pago
  on pagos_aplicados (pago_id);

create index if not exists idx_pagos_aplicados_factura
  on pagos_aplicados (empresa, serie, numero);

-- Auditoria cruda de webhooks.
create table if not exists eventos_pasarela (
  id uuid primary key default gen_random_uuid(),
  proveedor text not null,
  evento_id text not null,
  headers jsonb,
  payload jsonb not null,
  firma_valida boolean not null default false,
  procesado boolean not null default false,
  error_proceso text,
  procesado_en timestamptz not null default now(),
  unique (proveedor, evento_id)
);

alter table eventos_pasarela add column if not exists procesado boolean not null default false;
alter table eventos_pasarela add column if not exists error_proceso text;

create index if not exists idx_eventos_pasarela_proveedor
  on eventos_pasarela (proveedor, procesado_en desc);

-- Utilidad para mantener actualizado_en.
create or replace function set_actualizado_en()
returns trigger as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_ordenes_pago_actualizado_en on ordenes_pago;
create trigger trg_ordenes_pago_actualizado_en
before update on ordenes_pago
for each row execute function set_actualizado_en();

drop trigger if exists trg_intentos_pago_actualizado_en on intentos_pago;
create trigger trg_intentos_pago_actualizado_en
before update on intentos_pago
for each row execute function set_actualizado_en();
