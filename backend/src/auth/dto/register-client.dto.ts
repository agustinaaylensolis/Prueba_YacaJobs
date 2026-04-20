import { IsString, IsEmail, IsInt, Min, IsUrl, IsOptional, MinLength, IsNotEmpty } from 'class-validator';

export class RegisterClientDto {
  @IsString()
  @IsNotEmpty()
  nombre_y_apellido_cliente: string;

  @IsEmail()
  correo_cliente: string;

  @IsString()
  @MinLength(8)
  contraseña_cliente: string;

  @IsInt()
  @Min(1000000)
  dni_cliente: number;

  @IsInt()
  @Min(18, { message: 'La edad debe ser mayor o igual a 18 años.' })
  edad_cliente: number;

  @IsString()
  celular_cliente: string;

  // Estos campos se llenan después de subir a Supabase Storage
  @IsUrl()
  @IsOptional()
  url_dni_frente: string;

  @IsUrl()
  @IsOptional()
  url_dni_dorso: string;
}
