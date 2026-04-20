import { IsString, IsEmail, IsNumber, Min, IsUrl, IsOptional, MinLength, IsNotEmpty, IsBoolean, IsArray } from 'class-validator';

export class RegisterWorkerDto {
  @IsString()
  @IsNotEmpty()
  nombre_y_apellido_trabajador: string;

  @IsEmail()
  correo_trabajador: string;

  @IsString()
  @MinLength(8)
  contraseña_trabajador: string;

  @IsNumber()
  @Min(1000000)
  dni_trabajador: number;

  @IsString()
  nro_celular_trabajador: string;

  @IsArray()
  @IsNotEmpty({ message: 'Debes seleccionar al menos un oficio.' })
  id_oficios: number[];

  // Validaciones críticas de archivos
  @IsUrl({}, { message: 'Es obligatorio subir la foto del DNI Frente.' })
  url_dni_frente_trabajador: string;

  @IsUrl({}, { message: 'Es obligatorio subir la foto del DNI Reverso.' })
  url_dni_reverso_trabajador: string;

  @IsUrl({}, { message: 'Es obligatorio subir el Certificado de Buena Conducta.' })
  url_certificado_buena_conducta: string;

  @IsOptional()
  @IsUrl()
  monotributo_trabajador?: string;

  @IsOptional()
  @IsString()
  matricula_trabajador?: string;
}
