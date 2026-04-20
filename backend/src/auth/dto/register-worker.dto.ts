import { IsString, IsEmail, IsNumber, Min, IsUrl, IsOptional, MinLength, IsNotEmpty, IsBoolean, IsArray } from 'class-validator';

export class RegisterWorkerDto {
  @IsString({ message: 'El nombre y apellido debe ser texto.' })
  @IsNotEmpty({ message: 'El nombre y apellido es obligatorio.' })
  nombre_y_apellido_trabajador!: string;

  @IsEmail({}, { message: 'Ingresa un correo electronico valido.' })
  correo_trabajador!: string;

  @IsString({ message: 'La contraseña debe ser texto.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  contraseña_trabajador!: string;

  @IsNumber({}, { message: 'El DNI debe ser numerico.' })
  @Min(1000000, { message: 'El DNI debe empezar como máximo en 10 millones' })
  dni_trabajador!: number;

  @IsString({ message: '' })
  nro_celular_trabajador!: string;

  @IsArray({ message: 'Debes enviar una lista de oficios.' })
  @IsNotEmpty({ message: 'Debes seleccionar al menos un oficio.' })
  id_oficios!: number[];

  // Validaciones críticas de archivos
  @IsUrl({}, { message: 'Es obligatorio subir la foto del DNI Frente.' })
  url_dni_frente_trabajador!: string;

  @IsUrl({}, { message: 'Es obligatorio subir la foto del DNI Reverso.' })
  url_dni_reverso_trabajador!: string;

  @IsUrl({}, { message: 'Es obligatorio subir el Certificado de Buena Conducta.' })
  url_certificado_buena_conducta!: string;

  @IsOptional()
  @IsBoolean({ message: 'El campo monotributo debe ser verdadero o falso.' })
  monotributo_trabajador?: boolean;

  @IsOptional()
  @IsString({ message: 'La matricula debe ser texto.' })
  matricula_trabajador?: string;
}
