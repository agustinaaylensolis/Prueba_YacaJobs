import { Injectable, UnauthorizedException, BadRequestException, ConflictException, Inject } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { RegisterClientDto } from './dto/register-client.dto';
import { RegisterWorkerDto } from './dto/register-worker.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(@Inject(SupabaseService) private readonly supabaseService: SupabaseService) {}

  private get client() {
    return this.supabaseService.getClient();
  }

  async registerClient(dto: RegisterClientDto) {
    // 1. Check if email exists
    const { data: existing } = await this.client
      .from('clientes')
      .select('id_cliente')
      .eq('correo_cliente', dto.correo_cliente)
      .maybeSingle();

    if (existing) {
      throw new ConflictException('El correo ya está registrado como cliente');
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(dto.contraseña_cliente, 10);

    // 3. Insert into clientes table
    const { data, error } = await this.client
      .from('clientes')
      .insert({
        nombre_y_apellido_cliente: dto.nombre_y_apellido_cliente,
        correo_cliente: dto.correo_cliente,
        contraseña_cliente: hashedPassword,
        dni_cliente: dto.dni_cliente,
        edad_cliente: dto.edad_cliente,
        celular_cliente: dto.celular_cliente,
        url_dni_frente: dto.url_dni_frente,
        url_dni_dorso: dto.url_dni_dorso,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Error al registrar cliente: ${error.message}`);
    }

    return { message: 'Cliente registrado exitosamente', user: data };
  }

  async registerWorker(dto: RegisterWorkerDto) {
    // 1. Check if email exists
    const { data: existing } = await this.client
      .from('trabajadores')
      .select('id_trabajador')
      .eq('correo_trabajador', dto.correo_trabajador)
      .maybeSingle();

    if (existing) {
      throw new ConflictException('El correo ya está registrado como trabajador');
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(dto.contraseña_trabajador, 10);

    // 3. Insert into trabajadores table
    const { data: worker, error: workerError } = await this.client
      .from('trabajadores')
      .insert({
        nombre_y_apellido_trabajador: dto.nombre_y_apellido_trabajador,
        correo_trabajador: dto.correo_trabajador,
        contraseña_trabajador: hashedPassword,
        dni_trabajador: dto.dni_trabajador,
        nro_celular_trabajador: dto.nro_celular_trabajador,
        url_dni_frente_trabajador: dto.url_dni_frente_trabajador,
        url_dni_reverso_trabajador: dto.url_dni_reverso_trabajador,
        certificado_trabajador: dto.url_certificado_buena_conducta, // Corrected column name from SQL
        monotributo_trabajador: dto.monotributo_trabajador,
        matricula_trabajador: dto.matricula_trabajador,
      })
      .select()
      .single();

    if (workerError) {
      throw new BadRequestException(`Error al registrar trabajador: ${workerError.message}`);
    }

    // 4. Associate trades
    if (dto.id_oficios && dto.id_oficios.length > 0) {
      const tradesData = dto.id_oficios.map(id_oficio => ({
        id_trabajador: worker.id_trabajador, // Corrected id field from SQL
        id_oficio: id_oficio,
      }));

      const { error: tradesError } = await this.client
        .from('oficio_del_trabajador')
        .insert(tradesData);

      if (tradesError) {
        // Fallback or log?
        console.error('Error associating trades:', tradesError);
      }
    }

    return { message: 'Trabajador registrado exitosamente', user: worker };
  }

  async login(email: string, pass: string, role: 'CLIENT' | 'WORKER') {
    const table = role === 'CLIENT' ? 'clientes' : 'trabajadores';
    const emailField = role === 'CLIENT' ? 'correo_cliente' : 'correo_trabajador';
    const passField = role === 'CLIENT' ? 'contraseña_cliente' : 'contraseña_trabajador';

    // Search by email
    const { data, error } = await this.client
      .from(table)
      .select('*')
      .eq(emailField, email)
      .maybeSingle(); // Better than single() to avoid error on not found

    if (error) {
      console.error(`Error searching user in ${table}:`, error);
      throw new BadRequestException('Error al buscar usuario');
    }

    if (!data) {
      throw new UnauthorizedException('El correo no está registrado');
    }

    // Explicitly check for password using property accessor if 'ñ' is a concern
    const storedHashedPassword = data[passField];
    
    if (!storedHashedPassword) {
      throw new UnauthorizedException('Error en la recuperación de credenciales');
    }

    const isMatch = await bcrypt.compare(pass, storedHashedPassword);

    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Remove password from response
    delete data[passField];

    return {
      message: 'Login exitoso',
      user: {
        ...data,
        role,
      },
    };
  }

  async testDirectInsert() {
    const testEmail = `test_${Date.now()}@yacajobs.com`;
    const { data, error } = await this.client
      .from('trabajadores')
      .insert({
        nombre_y_apellido_trabajador: 'Test User',
        correo_trabajador: testEmail,
        contraseña_trabajador: 'nopassword',
        dni_trabajador: 12345678,
        nro_celular_trabajador: '12345678',
        url_dni_frente_trabajador: 'http://test.com/f',
        url_dni_reverso_trabajador: 'http://test.com/r',
        certificado_trabajador: 'http://test.com/c',
        monotributo_trabajador: false
      })
      .select()
      .single();

    if (error) {
      console.error('ERROR EN TEST DB:', error);
      throw error;
    }
    console.log('REGISTRO EXITOSO EN BD - ID GENERADO:', data.id_trabajador);
    return data;
  }
}
