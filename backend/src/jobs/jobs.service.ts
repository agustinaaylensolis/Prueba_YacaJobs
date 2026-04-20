import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';

@Injectable()
export class JobsService {
  constructor(@Inject(SupabaseService) private readonly supabaseService: SupabaseService) {}

  private get client() {
    return this.supabaseService.getClient();
  }

  async getTrades() {
    const { data, error } = await this.client.from('oficios').select('*');
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getWorkers(tradeId?: number) {
    let query = this.client
      .from('trabajadores')
      .select(`
        *,
        oficio_del_trabajador!inner (
          id_oficio
        )
      `);
    
    if (tradeId) {
      query = query.eq('oficio_del_trabajador.id_oficio', tradeId);
    }

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    
    // Enrich with actual trade names if needed, or let the component do it.
    // For MVP, we'll return the workers and their scores.
    return data;
  }

  async createPost(data: any) {
    const { data: post, error } = await this.client
      .from('publicaciones')
      .insert({
        descripcion_publi: data.descripcion_publi,
        tipo_urgencia: data.tipo_urgencia || 'Normal',
        id_cliente: data.id_cliente,
        id_oficio: data.id_oficio,
        estado_publi: 'Abierta',
        fecha_publi: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return post;
  }

  async getPosts(clientId?: number, tradeId?: number) {
    let query = this.client
      .from('publicaciones')
      .select('*, oficios(*), clientes(*)');

    if (clientId) query = query.eq('id_cliente', clientId);
    if (tradeId) query = query.eq('id_oficio', tradeId);
    
    query = query.order('fecha_publi', { ascending: false });

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async postulate(data: any) {
    console.log('[DEBUG] postulate received data:', data);
    
    const id_trabajador = Number(data.id_trabajador);
    const id_publi = Number(data.id_publi);
    const presupuesto = Number(data.presupuesto);

    if (isNaN(id_trabajador) || isNaN(id_publi) || isNaN(presupuesto)) {
      throw new BadRequestException('Datos numéricos inválidos');
    }

    const payload = {
      id_publi: id_publi,
      id_trabajador: id_trabajador,
      presupuesto: presupuesto,
      descripcion_postulacion: data.descripcion_postulacion || ''
    };

    console.log('[DEBUG] postulate payload to Supabase:', payload);

    const { data: postulation, error } = await this.client
      .from('postulaciones')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[DATABASE ERROR] detail:', JSON.stringify(error, null, 2));
      throw new BadRequestException(`Error de base de datos (${error.code}): ${error.message}`);
    }
    return postulation;
  }

  async updateProfile(role: 'CLIENT' | 'WORKER', id: number, updates: any) {
    const table = role === 'CLIENT' ? 'clientes' : 'trabajadores';
    const idField = role === 'CLIENT' ? 'id_cliente' : 'id_trabajador';

    const { data, error } = await this.client
      .from(table)
      .update(updates)
      .eq(idField, id)
      .select()
      .single();

    if (error) throw new BadRequestException(`Error al actualizar perfil: ${error.message}`);
    return data;
  }

  async getPostulations(postId: number) {
    const { data, error } = await this.client
      .from('postulaciones')
      .select('*, trabajadores(*)')
      .eq('id_publi', postId);

    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
