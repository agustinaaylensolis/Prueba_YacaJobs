-- Crear tabla de notificaciones para YacaJobs en Supabase
-- Ejecutar en el SQL Editor del proyecto correcto.

create table if not exists public.notificaciones (
    id_notificacion serial primary key,
    id_usuario int not null, -- Referencia al ID del usuario (trabajador o cliente)
    tipo_usuario varchar(20) not null default 'WORKER', -- 'WORKER' o 'CLIENT'
    titulo varchar(255) not null,
    mensaje text not null,
    id_publi int references public.publicaciones(id_publi) on delete cascade,
    leido boolean default false,
    fecha_creacion timestamp with time zone default current_timestamp
);

create index if not exists idx_notificaciones_usuario on public.notificaciones (id_usuario, tipo_usuario);
create index if not exists idx_notificaciones_leido on public.notificaciones (leido);
create index if not exists idx_notificaciones_fecha on public.notificaciones (fecha_creacion desc);

-- Políticas de seguridad (Opcional, útil si el frontend accede directo vía API anon)
-- alter table public.notificaciones enable row level security;
-- create policy "Lectura de notificaciones propias" on public.notificaciones for select using (true);
