import { Controller, Post, Get, Body, BadRequestException, HttpCode, HttpStatus, Inject, Res } from '@nestjs/common';
import type { Response } from 'express';
import { RegisterClientDto } from './dto/register-client.dto';
import { RegisterWorkerDto } from './dto/register-worker.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}
  
  @Post('register/client')
  async registerClient(@Body() registerDto: RegisterClientDto, @Res() res: Response) {
    console.log('DATOS RECIBIDOS EN BACKEND (CLIENT):', registerDto);
    try {
      if (!registerDto.url_dni_frente || !registerDto.url_dni_dorso) {
        throw new BadRequestException('Faltan imágenes del DNI obligatorias');
      }
      const user = await this.authService.registerClient(registerDto);
      console.log('REGISTRO EXITOSO EN BD (CLIENT)');
      return res.status(201).json({ status: 'success', message: 'Cliente registrado', user });
    } catch (error: any) {
      console.error('ERROR EN REGISTRO CLIENTE:', error);
      return res.status(error.status || 500).json({ status: 'error', message: error.message });
    }
  }

  @Post('register/worker')
  async registerWorker(@Body() registerDto: RegisterWorkerDto, @Res() res: Response) {
    console.log('DATOS RECIBIDOS EN BACKEND (WORKER):', registerDto);
    try {
      // Validación crítica: DNI + Buena Conducta + Al menos 1 oficio
      if (!registerDto.url_dni_frente_trabajador || !registerDto.url_dni_reverso_trabajador) {
          throw new BadRequestException('Faltan imágenes del DNI obligatorias');
      }

      if (!registerDto.url_certificado_buena_conducta) {
          throw new BadRequestException('El Certificado de Buena Conducta es obligatorio');
      }

      if (!registerDto.id_oficios || registerDto.id_oficios.length === 0) {
          throw new BadRequestException('Debes registrar al menos un oficio');
      }

      const user = await this.authService.registerWorker(registerDto);
      console.log('REGISTRO EXITOSO EN BD (WORKER)');
      return res.status(201).json({ status: 'success', message: 'Trabajador registrado', user });
    } catch (error: any) {
      console.error('ERROR EN REGISTRO TRABAJADOR:', error);
      return res.status(error.status || 500).json({ status: 'error', message: error.message });
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: { correo: string; contraseña: string; rol: 'CLIENT' | 'WORKER' }) {
    if (!loginDto.correo || !loginDto.contraseña || !loginDto.rol) {
      throw new BadRequestException('Datos de login incompletos');
    }
    return this.authService.login(loginDto.correo, loginDto.contraseña, loginDto.rol);
  }

  @Post('test-db')
  @HttpCode(HttpStatus.OK)
  async testDbPost(@Res() res: Response) {
    console.log('--- TEST DB POST ---');
    try {
      const result = await this.authService.testDirectInsert();
      return res.status(200).json({ status: 'success', result });
    } catch (error: any) {
      console.error('TEST DB ERROR:', error);
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }

  @Get('test-db')
  async testDbGet(@Res() res: Response) {
    console.log('--- TEST DB GET ---');
    try {
      const result = await this.authService.testDirectInsert();
      return res.status(200).json({ status: 'success', result });
    } catch (error: any) {
      console.error('TEST DB ERROR:', error);
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }

  @Get('ping')
  async ping(@Res() res: Response) {
    return res.status(200).json({ status: 'pong', time: new Date().toISOString() });
  }
}
