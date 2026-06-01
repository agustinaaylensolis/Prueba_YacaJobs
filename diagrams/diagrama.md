classDiagram

%% =========================
%% MODELO DE DOMINIO
%% =========================

class Usuario{
    +id
    +nombre_y_apellido
    +correo
    +contrasena
    +dni
    +edad
    +celular
    +url_foto_perfil
    +fecha_registro
}

class Cliente{
    +url_dni_frente
    +url_dni_dorso
    +url_certificado
    +crearPublicacion()
    +verMisPublicaciones()
    +aceptarPostulacion()
    +valorarTrabajador()
}

class Trabajador{
    +url_dni_frente_trabajador
    +url_dni_reverso_trabajador
    +certificado_trabajador
    +monotributo_trabajador
    +matricula_trabajador
    +puntuacion
    +postularse()
    +verMisPostulaciones()
    +agregarOficio()
}

class Oficio{
    +id_oficio
    +nombre_oficio
    +especialidad_oficio
}

class Publicacion{
    +id_publi
    +fecha_publi
    +tipo_urgencia
    +descripcion_publi
    +estado_publi
}

class Postulacion{
    +id_postulacion
    +presupuesto
    +descripcion_postulacion
    +fecha_postulacion
}

class Valoracion{
    +id_valoracion
    +puntuacion
    +comentario
    +fecha_valoracion
}

Usuario <|-- Cliente
Usuario <|-- Trabajador

Cliente "1" --> "1..*" Publicacion : crea
Publicacion "1" --> "1..*" Postulacion : recibe
Trabajador "1" --> "1..*" Postulacion : realiza

Trabajador "1..*" --> "1..*" Oficio : posee

Cliente "1" --> "1..*" Valoracion : realiza
Trabajador "1" --> "1..*" Valoracion : recibe


%% =========================
%% STRATEGY PATTERN
%% =========================

class ClientDashboard{
    +handleSearch()
    +handleViewWorkerProfile()
}

class SearchStrategy{
    <<interface>>
    +execute()
}

class SearchAllWorkersStrategy{
    +execute()
}

class SearchByTradeStrategy{
    +execute()
}

class SearchProfileStrategy{
    +execute()
}

class SearchStrategyFactory{
    +create(type)
}

SearchAllWorkersStrategy ..|> SearchStrategy
SearchByTradeStrategy ..|> SearchStrategy
SearchProfileStrategy ..|> SearchStrategy

SearchStrategyFactory --> SearchAllWorkersStrategy : creates
SearchStrategyFactory --> SearchByTradeStrategy : creates
SearchStrategyFactory --> SearchProfileStrategy : creates

ClientDashboard --> SearchStrategyFactory : solicita

ClientDashboard ..> SearchStrategy : utiliza


%% =========================
%% RELACION DEL PATRON CON EL NEGOCIO
%% =========================

SearchAllWorkersStrategy ..> Trabajador : obtiene

SearchByTradeStrategy ..> Trabajador : filtra

SearchByTradeStrategy ..> Oficio : busca por

SearchProfileStrategy ..> Trabajador : perfil completo