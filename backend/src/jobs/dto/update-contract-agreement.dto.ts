import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class UpdateContractAgreementDto {
  @IsInt()
  @Min(1)
  actorId!: number;

  @IsString()
  actorRole!: 'CLIENT' | 'WORKER';

  @IsOptional()
  @Min(0)
  precioFinalAcordado?: number;

  @IsOptional()
  @IsString()
  fechaHorarioAcordado?: string;

  @IsOptional()
  @IsBoolean()
  materialesIncluidos?: boolean;

  @IsOptional()
  @IsString()
  direccionOZona?: string;

  @IsOptional()
  @IsString()
  condicionesEspeciales?: string;

  @IsOptional()
  @IsString()
  detalleAcuerdo?: string;
}