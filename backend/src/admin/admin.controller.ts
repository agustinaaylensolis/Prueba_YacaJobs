import { Controller, Get, Post, Put, Delete, Patch, Body, Param, UseGuards, Inject, HttpCode, HttpStatus, ParseIntPipe } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('admin')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(@Inject(AdminService) private readonly adminService: AdminService) {}

  @Get('metrics')
  async getMetrics() {
    return this.adminService.getMetrics();
  }

  @Get('users')
  async getUsers() {
    return this.adminService.getUsers();
  }

  @Delete('users/:rol/:id')
  @HttpCode(HttpStatus.OK)
  async deleteUser(
    @Param('rol') rol: 'CLIENT' | 'WORKER',
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.adminService.deleteUser(rol, id);
  }

  @Get('oficios')
  async getOficios() {
    return this.adminService.getOficios();
  }

  @Post('oficios')
  async createOficio(
    @Body('nombre_oficio') nombre: string,
    @Body('especialidad_oficio') especialidad?: string
  ) {
    return this.adminService.createOficio(nombre, especialidad);
  }

  @Put('oficios/:id')
  async updateOficio(
    @Param('id', ParseIntPipe) id: number,
    @Body('nombre_oficio') nombre: string,
    @Body('especialidad_oficio') especialidad?: string
  ) {
    return this.adminService.updateOficio(id, nombre, especialidad);
  }

  @Delete('oficios/:id')
  async deleteOficio(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteOficio(id);
  }

  @Get('publications')
  async getPublications() {
    return this.adminService.getPublications();
  }

  @Patch('publications/:id/close')
  async forceClosePublication(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.forceClosePublication(id);
  }

  @Get('conversations')
  async getConversaciones() {
    return this.adminService.getConversaciones();
  }

  @Get('conversations/:id/messages')
  async getConversationMessages(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getConversationMessages(id);
  }

  @Patch('contracts/:id/status')
  async updateContractStatusForce(
    @Param('id', ParseIntPipe) id: number,
    @Body('estado_contratacion') estado: string
  ) {
    return this.adminService.updateContractStatusForce(id, estado);
  }
}
