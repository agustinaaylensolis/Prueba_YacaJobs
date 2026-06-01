import { IsNumber, IsString, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class PostulateDto {
  @IsNumber()
  @IsNotEmpty()
  id_publi!: number;

  @IsNumber()
  @IsOptional()
  id_trabajador?: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1, { message: 'El presupuesto debe ser mayor a 0' })
  presupuesto!: number;

  @IsString()
  @IsOptional()
  descripcion_postulacion?: string;
}
