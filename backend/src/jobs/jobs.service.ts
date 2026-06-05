import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { OpenConversationDto } from './dto/open-conversation.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { ContractAction, UpdateContractStatusDto } from './dto/update-contract-status.dto.js';
import { UpdateContractAgreementDto } from './dto/update-contract-agreement.dto.js';

type UserRole = 'CLIENT' | 'WORKER';

@Injectable()
export class JobsService {
  constructor(@Inject(SupabaseService) private readonly supabaseService: SupabaseService) {}

  private get client() {
    return this.supabaseService.getClient();
  }

  private normalizeRole(role: string): UserRole {
    if (role === 'CLIENT' || role === 'WORKER') return role;
    throw new BadRequestException('Rol invalido');
  }

  private async assertConversationAccess(conversationId: number, role: UserRole, userId: number) {
    const participantField = role === 'CLIENT' ? 'id_cliente' : 'id_trabajador';
    const { data, error } = await this.client
      .from('conversaciones')
      .select('*')
      .eq('id_conversacion', conversationId)
      .eq(participantField, userId)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new BadRequestException('No tienes acceso a esta conversacion');
    return data;
  }

  private async ensureContract(conversation: any) {
    const { data: existingContract, error: contractError } = await this.client
      .from('contrataciones')
      .select('*')
      .eq('id_conversacion', conversation.id_conversacion)
      .maybeSingle();

    if (contractError) throw new BadRequestException(contractError.message);
    if (existingContract) return existingContract;

    const { data: createdContract, error: createError } = await this.client
      .from('contrataciones')
      .insert({
        id_conversacion: conversation.id_conversacion,
        id_cliente: conversation.id_cliente,
        id_trabajador: conversation.id_trabajador,
        estado_contratacion: 'Pendiente',
      })
      .select()
      .single();

    if (createError) throw new BadRequestException(createError.message);
    return createdContract;
  }

  async openConversation(data: OpenConversationDto) {
    const clientId = Number(data.clientId);
    const workerId = Number(data.workerId);
    const publicationId = data.publicationId ? Number(data.publicationId) : undefined;
    const postulationId = data.postulationId ? Number(data.postulationId) : undefined;

    if (!Number.isFinite(clientId) || !Number.isFinite(workerId)) {
      throw new BadRequestException('Datos numericos invalidos para abrir la conversacion');
    }

    let query = this.client
      .from('conversaciones')
      .select('*')
      .eq('id_cliente', clientId)
      .eq('id_trabajador', workerId);

    if (Number.isFinite(publicationId as number)) {
      query = query.eq('id_publi', publicationId as number);
    } else {
      query = query.is('id_publi', null);
    }

    if (Number.isFinite(postulationId as number)) {
      query = query.eq('id_postulacion', postulationId as number);
    }

    const { data: existingConversation, error: existingError } = await query.maybeSingle();
    if (existingError) throw new BadRequestException(existingError.message);

    const conversation = existingConversation || await (async () => {
      const { data: createdConversation, error: createError } = await this.client
        .from('conversaciones')
        .insert({
          id_cliente: clientId,
          id_trabajador: workerId,
          id_publi: publicationId ?? null,
          id_postulacion: postulationId ?? null,
          estado_conversacion: 'Activa',
          ultima_actividad: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) throw new BadRequestException(createError.message);
      return createdConversation;
    })();

    // Obtener el nombre del trabajador para mostrarlo al cliente
    let counterpart_name: string | null = null;
    if (conversation.id_trabajador) {
      const { data: worker } = await this.client
        .from('trabajadores')
        .select('nombre_y_apellido_trabajador')
        .eq('id_trabajador', conversation.id_trabajador)
        .maybeSingle();
      counterpart_name = worker?.nombre_y_apellido_trabajador || null;
    }

    const contract = await this.ensureContract(conversation);
    return { conversation: { ...conversation, counterpart_name }, contract };
  }

  async getConversations(role: UserRole, userId: number) {
    const participantField = role === 'CLIENT' ? 'id_cliente' : 'id_trabajador';
    const { data: conversations, error } = await this.client
      .from('conversaciones')
      .select('*')
      .eq(participantField, userId)
      .order('ultima_actividad', { ascending: false });

    if (error) throw new BadRequestException(error.message);

    const enriched = await Promise.all((conversations || []).map(async (conversation: any) => {
      const [lastMessageResult, unreadCountResult, contractResult] = await Promise.all([
        this.client
          .from('mensajes')
          .select('*')
          .eq('id_conversacion', conversation.id_conversacion)
          .order('fecha_mensaje', { ascending: false })
          .limit(1)
          .maybeSingle(),
        this.client
          .from('mensajes')
          .select('id_mensaje', { count: 'exact', head: true })
          .eq('id_conversacion', conversation.id_conversacion)
          .not(role === 'CLIENT' ? 'id_emisor_trabajador' : 'id_emisor_cliente', 'is', null)
          .is(role === 'CLIENT' ? 'leido_por_cliente_at' : 'leido_por_trabajador_at', null),
        this.client
          .from('contrataciones')
          .select('*')
          .eq('id_conversacion', conversation.id_conversacion)
          .maybeSingle(),
      ]);

      if (lastMessageResult.error) throw new BadRequestException(lastMessageResult.error.message);
      if (unreadCountResult.error) throw new BadRequestException(unreadCountResult.error.message);
      if (contractResult.error) throw new BadRequestException(contractResult.error.message);

      return {
        ...conversation,
        last_message: lastMessageResult.data || null,
        unread_count: unreadCountResult.count || 0,
        contract: contractResult.data || null,
      };
    }));

    return enriched;
  }

  async getMessages(conversationId: number, role: UserRole, userId: number) {
    await this.assertConversationAccess(conversationId, role, userId);

    const { data, error } = await this.client
      .from('mensajes')
      .select('*')
      .eq('id_conversacion', conversationId)
      .order('fecha_mensaje', { ascending: true });

    if (error) throw new BadRequestException(error.message);

    await this.markConversationAsRead(conversationId, role, userId);
    return data;
  }

  async markConversationAsRead(conversationId: number, role: UserRole, userId: number) {
    await this.assertConversationAccess(conversationId, role, userId);

    const readColumn = role === 'CLIENT' ? 'leido_por_cliente_at' : 'leido_por_trabajador_at';
    const senderColumn = role === 'CLIENT' ? 'id_emisor_trabajador' : 'id_emisor_cliente';

    const { data, error } = await this.client
      .from('mensajes')
      .update({ [readColumn]: new Date().toISOString() })
      .eq('id_conversacion', conversationId)
      .not(senderColumn, 'is', null)
      .is(readColumn, null)
      .select('id_mensaje');

    if (error) throw new BadRequestException(error.message);
    return { success: true, updated: data?.length || 0 };
  }

  async sendMessage(conversationId: number, messageData: SendMessageDto) {
    const senderRole = this.normalizeRole(messageData.senderRole);
    const senderId = Number(messageData.senderId);
    const content = String(messageData.content || '').trim();

    if (!Number.isFinite(senderId) || !content) {
      throw new BadRequestException('Datos invalidos para enviar el mensaje');
    }

    await this.assertConversationAccess(conversationId, senderRole, senderId);

    const payload: any = {
      id_conversacion: conversationId,
      contenido_mensaje: content,
    };

    if (senderRole === 'CLIENT') {
      payload.id_emisor_cliente = senderId;
    } else {
      payload.id_emisor_trabajador = senderId;
    }

    const { data: message, error } = await this.client
      .from('mensajes')
      .insert(payload)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    const { error: conversationUpdateError } = await this.client
      .from('conversaciones')
      .update({
        ultimo_mensaje_preview: content.slice(0, 160),
        ultima_actividad: new Date().toISOString(),
      })
      .eq('id_conversacion', conversationId);

    if (conversationUpdateError) throw new BadRequestException(conversationUpdateError.message);

    return message;
  }

  async getConversationContract(conversationId: number, role: UserRole, userId: number) {
    await this.assertConversationAccess(conversationId, role, userId);

    const { data, error } = await this.client
      .from('contrataciones')
      .select('*')
      .eq('id_conversacion', conversationId)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateContractStatus(conversationId: number, data: UpdateContractStatusDto) {
    const actorRole = this.normalizeRole(data.actorRole);
    const actorId = Number(data.actorId);
    await this.assertConversationAccess(conversationId, actorRole, actorId);

    const { data: existingContract, error: contractError } = await this.client
      .from('contrataciones')
      .select('*')
      .eq('id_conversacion', conversationId)
      .maybeSingle();

    if (contractError) throw new BadRequestException(contractError.message);
    if (!existingContract) throw new BadRequestException('No existe una contratacion asociada a esta conversacion');

    const now = new Date().toISOString();
    const nextStatus = data.action === ContractAction.CONFIRM ? 'Confirmada' : 'Rechazada';

    const updatePayload: Record<string, any> = {
      estado_contratacion: nextStatus,
      detalle_acuerdo: data.note || existingContract.detalle_acuerdo || null,
      fecha_confirmacion: data.action === ContractAction.CONFIRM ? now : null,
      fecha_rechazo: data.action === ContractAction.REJECT ? now : null,
    };

    const { data: updatedContract, error } = await this.client
      .from('contrataciones')
      .update(updatePayload)
      .eq('id_contratacion', existingContract.id_contratacion)
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);

    const { error: conversationError } = await this.client
      .from('conversaciones')
      .update({ estado_conversacion: 'Cerrada', ultima_actividad: now })
      .eq('id_conversacion', conversationId);

    if (conversationError) throw new BadRequestException(conversationError.message);

    return updatedContract;
  }

  async updateContractAgreement(conversationId: number, data: UpdateContractAgreementDto) {
    const actorRole = this.normalizeRole(data.actorRole);
    const actorId = Number(data.actorId);
    await this.assertConversationAccess(conversationId, actorRole, actorId);

    const { data: existingContract, error: contractError } = await this.client
      .from('contrataciones')
      .select('*')
      .eq('id_conversacion', conversationId)
      .maybeSingle();

    if (contractError) throw new BadRequestException(contractError.message);
    if (!existingContract) throw new BadRequestException('No existe una contratacion asociada a esta conversacion');
    if (actorRole === 'CLIENT') {
      throw new BadRequestException('Solo el trabajador puede registrar el acuerdo');
    }
    if (existingContract.estado_contratacion !== 'Confirmada') {
      throw new BadRequestException('El acuerdo solo puede guardarse cuando la contratacion esta confirmada');
    }

    const normalizedPrice = data.precioFinalAcordado === undefined || data.precioFinalAcordado === null
      ? null
      : Number(data.precioFinalAcordado);

    if (normalizedPrice !== null && Number.isNaN(normalizedPrice)) {
      throw new BadRequestException('precioFinalAcordado debe ser numerico');
    }

    const agreementPayload: Record<string, any> = {
      precio_final_acordado: normalizedPrice,
      monto_acordado: normalizedPrice,
      fecha_horario_acordado: data.fechaHorarioAcordado || null,
      materiales_incluidos: data.materialesIncluidos ?? null,
      direccion_o_zona: data.direccionOZona || null,
      condiciones_especiales: data.condicionesEspeciales || null,
      detalle_acuerdo: data.detalleAcuerdo || null,
    };

    const { data: updatedContract, error } = await this.client
      .from('contrataciones')
      .update(agreementPayload)
      .eq('id_contratacion', existingContract.id_contratacion)
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);

    const previewParts = [
      normalizedPrice !== null ? `Precio $${normalizedPrice}` : null,
      data.fechaHorarioAcordado ? `Fecha ${data.fechaHorarioAcordado}` : null,
      data.direccionOZona ? `Zona ${data.direccionOZona}` : null,
    ].filter(Boolean);

    const { error: conversationError } = await this.client
      .from('conversaciones')
      .update({
        ultimo_mensaje_preview: previewParts.join(' | ') || 'Acuerdo actualizado',
        ultima_actividad: new Date().toISOString(),
      })
      .eq('id_conversacion', conversationId);

    if (conversationError) throw new BadRequestException(conversationError.message);

    return updatedContract;
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

  async searchWorkersByText(q: string) {
    console.log('[DEBUG searchWorkersByText] q:', q);

    // Escapar caracteres especiales de ILIKE (% y _) para que no funcionen como comodines
    const escapedQ = q.replace(/[%_]/g, '\\$&');
    const searchTerm = `%${escapedQ}%`;
    console.log('[DEBUG searchWorkersByText] searchTerm:', searchTerm);

    // Buscar IDs de oficios que coincidan con el texto
    const { data: matchingTrades, error: tradesError } = await this.client
      .from('oficios')
      .select('id_oficio')
      .ilike('nombre_oficio', searchTerm);

    if (tradesError) {
      console.error('[DEBUG searchWorkersByText] tradesError:', JSON.stringify(tradesError, null, 2));
      throw new BadRequestException(tradesError.message);
    }

    const tradeIds = (matchingTrades || []).map(t => t.id_oficio);
    console.log('[DEBUG searchWorkersByText] tradeIds:', tradeIds);

    // Query A: buscar trabajadores por nombre (coincidencia ILIKE sobre la tabla raíz)
    const { data: nameMatches, error: nameError } = await this.client
      .from('trabajadores')
      .select(`
        *,
        oficio_del_trabajador (
          id_oficio,
          oficios (
            id_oficio,
            nombre_oficio
          )
        )
      `)
      .ilike('nombre_y_apellido_trabajador', searchTerm)
      .limit(50);

    if (nameError) {
      console.error('[DEBUG searchWorkersByText] nameError:', JSON.stringify(nameError, null, 2));
      throw new BadRequestException(nameError.message);
    }

    let allWorkers = [...(nameMatches || [])];

    // Query B: buscar trabajadores por oficio (solo si hay tradeIds)
    if (tradeIds.length > 0) {
      const { data: tradeMatches, error: tradeError } = await this.client
        .from('trabajadores')
        .select(`
          *,
          oficio_del_trabajador!inner (
            id_oficio,
            oficios (
              id_oficio,
              nombre_oficio
            )
          )
        `)
        .in('oficio_del_trabajador.id_oficio', tradeIds)
        .limit(50);

      if (tradeError) {
        console.error('[DEBUG searchWorkersByText] tradeError:', JSON.stringify(tradeError, null, 2));
        throw new BadRequestException(tradeError.message);
      }

      // Deduplicar por id_trabajador (un trabajador puede coincidir por nombre y por oficio)
      const existingIds = new Set(allWorkers.map(w => w.id_trabajador));
      for (const worker of (tradeMatches || [])) {
        if (!existingIds.has(worker.id_trabajador)) {
          allWorkers.push(worker);
          existingIds.add(worker.id_trabajador);
        }
      }
    }

    // Limitar a 50 resultados combinados
    allWorkers = allWorkers.slice(0, 50);

    // Normalizar estructura para que sea consistente con getWorkerProfile
    return allWorkers.map((worker: any) => ({
      ...worker,
      oficios: (worker.oficio_del_trabajador || [])
        .map((item: any) => item?.oficios)
        .filter(Boolean),
      oficio_del_trabajador: undefined, // limpiar raw join
    }));
  }

  async getWorkerProfile(workerId: number) {
    const { data: worker, error: workerError } = await this.client
      .from('trabajadores')
      .select(`
        id_trabajador,
        nombre_y_apellido_trabajador,
        correo_trabajador,
        nro_celular_trabajador,
        url_foto_perfil,
        puntuacion,
        fecha_registro,
        oficio_del_trabajador (
          oficios (
            id_oficio,
            nombre_oficio
          )
        )
      `)
      .eq('id_trabajador', workerId)
      .maybeSingle();

    if (workerError) throw new BadRequestException(workerError.message);
    if (!worker) throw new BadRequestException('No se encontro el trabajador solicitado');

    const { data: reviews, error: reviewsError } = await this.client
      .from('valoraciones')
      .select('id_valoracion, puntuacion, comentario, fecha_valoracion, clientes(nombre_y_apellido_cliente)')
      .eq('id_receptor_trabajador', workerId)
      .order('fecha_valoracion', { ascending: false })
      .limit(6);

    if (reviewsError) throw new BadRequestException(reviewsError.message);

    const { count: reviewsCount, error: reviewsCountError } = await this.client
      .from('valoraciones')
      .select('id_valoracion', { count: 'exact', head: true })
      .eq('id_receptor_trabajador', workerId);

    if (reviewsCountError) throw new BadRequestException(reviewsCountError.message);

    const { count: completedWorks, error: worksError } = await this.client
      .from('postulaciones')
      .select('id_postulacion', { count: 'exact', head: true })
      .eq('id_trabajador', workerId);

    if (worksError) throw new BadRequestException(worksError.message);

    const trades = (worker.oficio_del_trabajador || [])
      .map((item: any) => item?.oficios)
      .filter(Boolean);

    const normalizedReviews = (reviews || []).map((review: any) => ({
      id_valoracion: review.id_valoracion,
      puntuacion: review.puntuacion,
      comentario: review.comentario,
      fecha_valoracion: review.fecha_valoracion,
      cliente: review.clientes?.nombre_y_apellido_cliente || 'Cliente',
    }));

    return {
      id_trabajador: worker.id_trabajador,
      nombre_y_apellido_trabajador: worker.nombre_y_apellido_trabajador,
      correo_trabajador: worker.correo_trabajador,
      nro_celular_trabajador: worker.nro_celular_trabajador,
      url_foto_perfil: worker.url_foto_perfil,
      puntuacion: worker.puntuacion,
      fecha_registro: worker.fecha_registro,
      oficios: trades,
      valoraciones: normalizedReviews,
      cantidad_valoraciones: reviewsCount || 0,
      trabajos_realizados: completedWorks || 0,
    };
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

  async getPosts(clientId?: number, tradeId?: number, workerId?: number) {
    let workerTradeIds: number[] = [];

    if (workerId) {
      const { data: workerTrades, error: workerTradesError } = await this.client
        .from('oficio_del_trabajador')
        .select('id_oficio')
        .eq('id_trabajador', workerId);

      if (workerTradesError) throw new BadRequestException(workerTradesError.message);

      workerTradeIds = (workerTrades || [])
        .map((item: any) => Number(item.id_oficio))
        .filter((id: number) => Number.isFinite(id));

      if (workerTradeIds.length === 0) {
        return [];
      }
    }

    let query = this.client
      .from('publicaciones')
      .select('*, oficios(*), clientes(*)');

    if (clientId) query = query.eq('id_cliente', clientId);
    if (tradeId) query = query.eq('id_oficio', tradeId);
    if (workerTradeIds.length > 0) query = query.in('id_oficio', workerTradeIds);
    if (workerId) query = query.eq('estado_publi', 'Abierta');
    
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

  async deletePost(postId: number, clientId: number) {
    // 1. Verificar que la publicación exista y pertenezca al cliente
    const { data: post, error: fetchError } = await this.client
      .from('publicaciones')
      .select('id_cliente')
      .eq('id_publi', postId)
      .maybeSingle();

    if (fetchError) throw new BadRequestException(fetchError.message);
    if (!post) throw new BadRequestException('La publicación no existe');
    
    if (post.id_cliente !== clientId) {
      throw new BadRequestException('No tienes permiso para eliminar esta publicación');
    }

    // 2. Proceder con la eliminación (el CASCADE se encarga de las postulaciones)
    const { error: deleteError } = await this.client
      .from('publicaciones')
      .delete()
      .eq('id_publi', postId);

    if (deleteError) throw new BadRequestException(deleteError.message);
    
    return { success: true, message: 'Publicación eliminada correctamente' };
  }
}
