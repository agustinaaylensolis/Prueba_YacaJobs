import { Controller, Get, Post, Body, Query, Param, BadRequestException, Inject } from '@nestjs/common';
import { JobsService } from './jobs.service.js';
import { PostulateDto } from './dto/postulate.dto.js';
import { CreatePostDto } from './dto/create-post.dto.js';

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
  async getWorkers(@Query('tradeId') tradeId?: string) {
    return this.jobsService.getWorkers(tradeId ? parseInt(tradeId) : undefined);
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
}
