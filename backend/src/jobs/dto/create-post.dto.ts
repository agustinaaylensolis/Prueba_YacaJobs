import { IsNumber, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  descripcion_publi!: string;

  @IsString()
  @IsNotEmpty()
  tipo_urgencia!: string;

  @IsNumber()
  @IsNotEmpty()
  id_oficio!: number;

  // `id_cliente` should never be trusted from the client. Keep optional for backwards compatibility,
  // but the controller will ignore it and use authenticated user id instead.
  @IsNumber()
  @IsOptional()
  id_cliente?: number;
}
