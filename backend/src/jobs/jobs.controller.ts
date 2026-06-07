import { Controller, Get, Post, Body, Query, Param, Delete, Patch, BadRequestException, Inject, ForbiddenException } from '@nestjs/common';
import { JobsService } from './jobs.service.js';
import { PostulateDto } from './dto/postulate.dto.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { OpenConversationDto } from './dto/open-conversation.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { UpdateContractStatusDto } from './dto/update-contract-status.dto.js';
import { UpdateContractAgreementDto } from './dto/update-contract-agreement.dto.js';

@Controller('jobs')
export class JobsController {
  constructor(@Inject(JobsService) private readonly jobsService: JobsService) {}

  @Get('trades')
  async getTrades() {
    console.log('[DEBUG] getTrades called');
    if (!this.jobsService) {
      console.error('[ERROR] jobsService is UNDEFINED in getTrades');
      throw new BadRequestException('Internal Server Error: JobsService missing');
    }
    return this.jobsService.getTrades();
  }

  @Get('workers')
  async getWorkers(@Query('tradeId') tradeId?: string, @Query('q') q?: string) {
    if (q) {
      return this.jobsService.searchWorkersByText(q);
    }
    return this.jobsService.getWorkers(tradeId ? parseInt(tradeId) : undefined);
  }

  @Get('workers/search')
  async searchWorkers(@Query('q') q: string) {
    if (!q || q.trim() === '') {
      throw new BadRequestException('El parámetro de búsqueda "q" es requerido');
    }
    return this.jobsService.searchWorkersByText(q.trim());
  }

  @Get('workers/:workerId')
  async getWorkerProfile(@Param('workerId') workerId: string) {
    const parsedId = parseInt(workerId, 10);
    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('ID de trabajador invalido');
    }
    return this.jobsService.getWorkerProfile(parsedId);
  }

  @Post('post')
  async createPost(@Body() data: CreatePostDto) {
    return this.jobsService.createPost(data);
  }

  @Get('posts')
  async getPosts(@Query('clientId') clientId?: string, @Query('tradeId') tradeId?: string, @Query('workerId') workerId?: string) {
    let parsedClientId: number | undefined;
    let parsedTradeId: number | undefined;
    let parsedWorkerId: number | undefined;

    if (typeof clientId === 'string' && clientId.trim() !== '') {
      parsedClientId = parseInt(clientId, 10);
      if (Number.isNaN(parsedClientId)) {
        throw new BadRequestException('clientId invalido');
      }
    }

    if (typeof tradeId === 'string' && tradeId.trim() !== '') {
      parsedTradeId = parseInt(tradeId, 10);
      if (Number.isNaN(parsedTradeId)) {
        throw new BadRequestException('tradeId invalido');
      }
    }

    if (typeof workerId === 'string' && workerId.trim() !== '') {
      parsedWorkerId = parseInt(workerId, 10);
      if (Number.isNaN(parsedWorkerId)) {
        throw new BadRequestException('workerId invalido');
      }
    }

    return this.jobsService.getPosts(parsedClientId, parsedTradeId, parsedWorkerId);
  }

  @Post('postulate')
  async postulate(@Body() data: PostulateDto) {
    // La validación ahora viene del ValidationPipe
    return this.jobsService.postulate(data);
  }

  @Post('profile/update')
  async updateProfile(@Body() data: { role: 'CLIENT' | 'WORKER', id: number, updates: any }) {
    if (!data.role || !data.id || !data.updates) {
      throw new BadRequestException('Faltan datos para la actualización del perfil');
    }
    return this.jobsService.updateProfile(data.role, data.id, data.updates);
  }

  @Get('postulations/:postId')
  async getPostulations(@Param('postId') postId: string) {
    return this.jobsService.getPostulations(parseInt(postId));
  }

  @Delete('posts/:id')
  async deletePost(@Param('id') id: string, @Query('clientId') clientId: string) {
    const parsedPostId = parseInt(id, 10);
    const parsedClientId = parseInt(clientId, 10);

    if (Number.isNaN(parsedPostId) || Number.isNaN(parsedClientId)) {
      throw new BadRequestException('ID de publicación o cliente inválido');
    }

    try {
      return await this.jobsService.deletePost(parsedPostId, parsedClientId);
    } catch (error: any) {
      if (error.message.includes('permiso')) {
        throw new ForbiddenException(error.message);
      }
      throw error;
    }
  }

  @Post('conversations/open')
  async openConversation(@Body() data: OpenConversationDto) {
    return this.jobsService.openConversation(data);
  }

  @Get('history')
  async getHistory(
    @Query('userId') userId: string,
    @Query('role') role: string,
  ) {
    const parsedUserId = parseInt(userId, 10);
    if (Number.isNaN(parsedUserId) || !role) {
      throw new BadRequestException('userId y role son requeridos y deben ser válidos');
    }
    return this.jobsService.getContractHistory(parsedUserId, role);
  }

  @Patch('posts/:id/close-manual')
  async closePostManual(
    @Param('id') id: string,
    @Body('clientId') clientId: number,
  ) {
    const parsedPostId = parseInt(id, 10);
    if (Number.isNaN(parsedPostId) || !clientId) {
      throw new BadRequestException('ID de publicación y clientId inválidos');
    }
    return this.jobsService.closePostManual(parsedPostId, Number(clientId));
  }

  @Get('conversations')
  async getConversations(@Query('role') role: 'CLIENT' | 'WORKER', @Query('userId') userId: string) {
    const parsedUserId = parseInt(userId, 10);
    if (!role || !['CLIENT', 'WORKER'].includes(role) || Number.isNaN(parsedUserId)) {
      throw new BadRequestException('Datos inválidos para listar conversaciones');
    }

    return this.jobsService.getConversations(role, parsedUserId);
  }

  @Get('conversations/:conversationId/messages')
  async getMessages(
    @Param('conversationId') conversationId: string,
    @Query('role') role: 'CLIENT' | 'WORKER',
    @Query('userId') userId: string,
  ) {
    const parsedConversationId = parseInt(conversationId, 10);
    const parsedUserId = parseInt(userId, 10);

    if (!role || !['CLIENT', 'WORKER'].includes(role) || Number.isNaN(parsedConversationId) || Number.isNaN(parsedUserId)) {
      throw new BadRequestException('Datos inválidos para obtener mensajes');
    }

    return this.jobsService.getMessages(parsedConversationId, role, parsedUserId);
  }

  @Post('conversations/:conversationId/messages')
  async sendMessage(
    @Param('conversationId') conversationId: string,
    @Body() data: SendMessageDto,
  ) {
    const parsedConversationId = parseInt(conversationId, 10);
    if (Number.isNaN(parsedConversationId)) {
      throw new BadRequestException('ID de conversación inválido');
    }

    return this.jobsService.sendMessage(parsedConversationId, data);
  }

  @Post('conversations/:conversationId/read')
  async markConversationAsRead(
    @Param('conversationId') conversationId: string,
    @Body() data: { role: 'CLIENT' | 'WORKER'; userId: number },
  ) {
    const parsedConversationId = parseInt(conversationId, 10);
    if (Number.isNaN(parsedConversationId) || !data?.role || !['CLIENT', 'WORKER'].includes(data.role) || !data.userId) {
      throw new BadRequestException('Datos inválidos para marcar lectura');
    }

    return this.jobsService.markConversationAsRead(parsedConversationId, data.role, Number(data.userId));
  }

  @Get('conversations/:conversationId/contract')
  async getConversationContract(
    @Param('conversationId') conversationId: string,
    @Query('role') role: 'CLIENT' | 'WORKER',
    @Query('userId') userId: string,
  ) {
    const parsedConversationId = parseInt(conversationId, 10);
    const parsedUserId = parseInt(userId, 10);
    if (Number.isNaN(parsedConversationId) || !role || !['CLIENT', 'WORKER'].includes(role) || Number.isNaN(parsedUserId)) {
      throw new BadRequestException('ID de conversación inválido');
    }

    return this.jobsService.getConversationContract(parsedConversationId, role, parsedUserId);
  }

  @Post('conversations/:conversationId/contract/status')
  async updateContractStatus(
    @Param('conversationId') conversationId: string,
    @Body() data: UpdateContractStatusDto,
  ) {
    const parsedConversationId = parseInt(conversationId, 10);
    if (Number.isNaN(parsedConversationId)) {
      throw new BadRequestException('ID de conversación inválido');
    }

    return this.jobsService.updateContractStatus(parsedConversationId, data);
  }

  @Post('conversations/:conversationId/rate')
  async submitRating(
    @Param('conversationId') conversationId: string,
    @Body() data: {
      puntuacion: number;
      comentario?: string;
      id_emisor_cliente: number;
      id_receptor_trabajador: number;
    }
  ) {
    const parsedConversationId = parseInt(conversationId, 10);
    if (Number.isNaN(parsedConversationId)) {
      throw new BadRequestException('ID de conversación inválido');
    }
    return this.jobsService.submitRatingAndFinalize(parsedConversationId, data);
  }

  @Post('conversations/:conversationId/contract/agreement')
  async updateContractAgreement(
    @Param('conversationId') conversationId: string,
    @Body() data: UpdateContractAgreementDto,
  ) {
    const parsedConversationId = parseInt(conversationId, 10);
    if (Number.isNaN(parsedConversationId)) {
      throw new BadRequestException('ID de conversación inválido');
    }

    return this.jobsService.updateContractAgreement(parsedConversationId, data);
  }
}
