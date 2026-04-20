import { IsString, IsEmail, IsInt, Min, IsUrl, IsOptional, MinLength, IsNotEmpty } from 'class-validator';

export class RegisterClientDto {
  @IsString({ message: 'El nombre y apellido debe ser texto.' })
  @IsNotEmpty({ message: 'El nombre y apellido es obligatorio.' })
  nombre_y_apellido_cliente!: string;

  @IsEmail({}, { message: 'Ingresa un correo electronico valido.' })
  correo_cliente!: string;

  @IsString({ message: 'La contraseña debe ser texto.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  contraseña_cliente!: string;

  @IsInt({ message: 'El DNI debe ser numerico.' })
  @Min(1000000, { message: 'El DNI es obligatorio' })
  dni_cliente!: number;

  @IsInt({ message: 'La edad debe ser numerica.' })
  @Min(18, { message: 'La edad debe ser mayor o igual a 18 años.' })
  edad_cliente!: number;

  @IsString({ message: 'El celular debe ser texto.' })
  celular_cliente!: string;

  // Estos campos se llenan después de subir a Supabase Storage
  @IsUrl({}, { message: 'La URL del DNI frente no es valida.' })
  @IsOptional()
  url_dni_frente!: string;

  @IsUrl({}, { message: 'La URL del DNI dorso no es valida.' })
  @IsOptional()
  url_dni_dorso!: string;
}
