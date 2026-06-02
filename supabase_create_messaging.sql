-- Crear tablas de mensajeria para YacaJobs en Supabase
-- Ejecutar en el SQL Editor del proyecto correcto.

create table if not exists public.conversaciones (
    id_conversacion serial primary key,
    id_cliente int not null references public.clientes(id_cliente) on delete cascade,
    id_trabajador int not null references public.trabajadores(id_trabajador) on delete cascade,
    id_publi int references public.publicaciones(id_publi) on delete set null,
    id_postulacion int references public.postulaciones(id_postulacion) on delete set null,
    estado_conversacion varchar(20) not null default 'Activa',
    ultimo_mensaje_preview text,
    ultima_actividad timestamp with time zone default current_timestamp,
    fecha_creacion timestamp with time zone default current_timestamp,
    unique (id_cliente, id_trabajador, id_publi)
);

create index if not exists idx_conversaciones_cliente on public.conversaciones (id_cliente);
create index if not exists idx_conversaciones_trabajador on public.conversaciones (id_trabajador);
create index if not exists idx_conversaciones_ultima_actividad on public.conversaciones (ultima_actividad desc);

alter table public.conversaciones enable row level security;

do $$
begin
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'conversaciones'
          and policyname = 'conversaciones_select_participantes'
    ) then
        create policy conversaciones_select_participantes
        on public.conversaciones
        for select
        to authenticated
        using (
            auth.uid() is not null
        );
    end if;

    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'conversaciones'
          and policyname = 'conversaciones_insert_authenticated'
    ) then
        create policy conversaciones_insert_authenticated
        on public.conversaciones
        for insert
        to authenticated
        with check (
            auth.uid() is not null
        );
    end if;

    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'conversaciones'
          and policyname = 'conversaciones_update_authenticated'
    ) then
        create policy conversaciones_update_authenticated
        on public.conversaciones
        for update
        to authenticated
        using (
            auth.uid() is not null
        )
        with check (
            auth.uid() is not null
        );
    end if;
end $$;

create table if not exists public.mensajes (
    id_mensaje serial primary key,
    id_conversacion int not null references public.conversaciones(id_conversacion) on delete cascade,
    id_emisor_cliente int references public.clientes(id_cliente) on delete cascade,
    id_emisor_trabajador int references public.trabajadores(id_trabajador) on delete cascade,
    contenido_mensaje text not null,
    leido_por_cliente_at timestamp with time zone,
    leido_por_trabajador_at timestamp with time zone,
    fecha_mensaje timestamp with time zone default current_timestamp,
    constraint ck_emisor_unico check (
        (id_emisor_cliente is not null and id_emisor_trabajador is null)
        or (id_emisor_cliente is null and id_emisor_trabajador is not null)
    )
);

create index if not exists idx_mensajes_conversacion_fecha on public.mensajes (id_conversacion, fecha_mensaje desc);

alter table public.mensajes enable row level security;

do $$
begin
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'mensajes'
          and policyname = 'mensajes_select_participantes'
    ) then
        create policy mensajes_select_participantes
        on public.mensajes
        for select
        to authenticated
        using (
            auth.uid() is not null
        );
    end if;

    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'mensajes'
          and policyname = 'mensajes_insert_authenticated'
    ) then
        create policy mensajes_insert_authenticated
        on public.mensajes
        for insert
        to authenticated
        with check (
            auth.uid() is not null
        );
    end if;

    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'mensajes'
          and policyname = 'mensajes_update_authenticated'
    ) then
        create policy mensajes_update_authenticated
        on public.mensajes
        for update
        to authenticated
        using (
            auth.uid() is not null
        )
        with check (
            auth.uid() is not null
        );
    end if;
end $$;

create table if not exists public.contrataciones (
    id_contratacion serial primary key,
    id_conversacion int not null unique references public.conversaciones(id_conversacion) on delete cascade,
    id_cliente int not null references public.clientes(id_cliente) on delete cascade,
    id_trabajador int not null references public.trabajadores(id_trabajador) on delete cascade,
    estado_contratacion varchar(20) not null default 'Pendiente',
    monto_acordado numeric(12,2),
    precio_final_acordado numeric(12,2),
    fecha_horario_acordado timestamp with time zone,
    materiales_incluidos boolean,
    direccion_o_zona text,
    condiciones_especiales text,
    fecha_solicitud timestamp with time zone default current_timestamp,
    fecha_confirmacion timestamp with time zone,
    fecha_rechazo timestamp with time zone
);

create index if not exists idx_contrataciones_cliente on public.contrataciones (id_cliente);
create index if not exists idx_contrataciones_trabajador on public.contrataciones (id_trabajador);
create index if not exists idx_contrataciones_estado on public.contrataciones (estado_contratacion);

alter table public.contrataciones enable row level security;

do $$
begin
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'contrataciones'
          and policyname = 'contrataciones_select_authenticated'
    ) then
        create policy contrataciones_select_authenticated
        on public.contrataciones
        for select
        to authenticated
        using (
            auth.uid() is not null
        );
    end if;

    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'contrataciones'
          and policyname = 'contrataciones_insert_authenticated'
    ) then
        create policy contrataciones_insert_authenticated
        on public.contrataciones
        for insert
        to authenticated
        with check (
            auth.uid() is not null
        );
    end if;

    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'contrataciones'
          and policyname = 'contrataciones_update_authenticated'
    ) then
        create policy contrataciones_update_authenticated
        on public.contrataciones
        for update
        to authenticated
        using (
            auth.uid() is not null
        )
        with check (
            auth.uid() is not null
        );
    end if;
end $$;

-- Si usas RLS en tu proyecto, habilitalo y crea las policies despues de ejecutar este script.
-- La app puede no mostrar mensajes si RLS bloquea la lectura/escritura aunque las tablas existan.
