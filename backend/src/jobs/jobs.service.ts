import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { OpenConversationDto } from './dto/open-conversation.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { ContractAction, UpdateContractStatusDto } from './dto/update-contract-status.dto.js';
import { UpdateContractAgreementDto } from './dto/update-contract-agreement.dto.js';
import { JobPostingNotifier } from './observers/job-posting.notifier.js';
import { MessageNotifier } from './observers/message.notifier.js';
import { ContractNotifier } from './observers/contract.notifier.js';

type UserRole = 'CLIENT' | 'WORKER';

@Injectable()
export class JobsService {
  constructor(
    @Inject(SupabaseService) private readonly supabaseService: SupabaseService,
    @Inject(JobPostingNotifier) private readonly jobPostingNotifier: JobPostingNotifier,
    @Inject(MessageNotifier) private readonly messageNotifier: MessageNotifier,
    @Inject(ContractNotifier) private readonly contractNotifier: ContractNotifier,
  ) {}

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

  private async ensureContract(conversation: any, forceReset = false) {
    const { data: existingContract, error: contractError } = await this.client
      .from('contrataciones')
      .select('*')
      .eq('id_conversacion', conversation.id_conversacion)
      .maybeSingle();

    if (contractError) throw new BadRequestException(contractError.message);
    
    if (existingContract) {
      const isFinalized = ['Cancelada', 'Confirmada', 'Rechazada'].includes(existingContract.estado_contratacion);
      if (forceReset || isFinalized) {
        const { data: resetContract, error: updateError } = await this.client
          .from('contrataciones')
          .update({
            estado_contratacion: 'Pendiente',
            monto_acordado: null,
            precio_final_acordado: null,
            fecha_horario_acordado: null,
            direccion_o_zona: null,
            condiciones_especiales: null,
            detalle_acuerdo: null,
            fecha_confirmacion: null,
            fecha_rechazo: null,
            materiales_incluidos: null,
            descripcion_materiales: null,
          })
          .eq('id_contratacion', existingContract.id_contratacion)
          .select()
          .single();

        if (updateError) throw new BadRequestException(updateError.message);
        return resetContract;
      }
      return existingContract;
    }

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

    const { data: existingConversation, error: existingError } = await this.client
      .from('conversaciones')
      .select('*')
      .eq('id_cliente', clientId)
      .eq('id_trabajador', workerId)
      .maybeSingle();

    if (existingError) throw new BadRequestException(existingError.message);

    let conversation = existingConversation;
    let forceResetContract = false;

    if (existingConversation) {
      // Si la conversación ya existe pero se abre para una publicación diferente/nueva,
      // actualizamos los enlaces de la publicación/postulación y reactivamos la conversación.
      const shouldUpdatePub = publicationId !== undefined && existingConversation.id_publi !== publicationId;
      
      if (shouldUpdatePub || existingConversation.estado_conversacion === 'Cerrada') {
        const updatePayload: Record<string, any> = {
          estado_conversacion: 'Activa',
          ultima_actividad: new Date().toISOString(),
        };
        if (publicationId !== undefined) {
          updatePayload.id_publi = publicationId;
          updatePayload.id_postulacion = postulationId ?? null;
        }

        const { data: updatedConversation, error: updateError } = await this.client
          .from('conversaciones')
          .update(updatePayload)
          .eq('id_conversacion', existingConversation.id_conversacion)
          .select()
          .single();

        if (updateError) throw new BadRequestException(updateError.message);
        conversation = updatedConversation;

        if (shouldUpdatePub) {
          forceResetContract = true;
        }
      }
    } else {
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
      conversation = createdConversation;
    }

    const contract = await this.ensureContract(conversation, forceResetContract);

    // Fetch counterpart names so the frontend can display them immediately
    const [{ data: workerProfile }] = await Promise.all([
      this.client
        .from('trabajadores')
        .select('nombre_y_apellido_trabajador, url_foto_perfil')
        .eq('id_trabajador', workerId)
        .maybeSingle(),
    ]);

    const enrichedConversation = {
      ...conversation,
      counterpart_name: workerProfile?.nombre_y_apellido_trabajador ?? null,
      counterpart_avatar: workerProfile?.url_foto_perfil ?? null,
      contract,
    };

    return { conversation: enrichedConversation, contract };
  }

  async getConversations(role: UserRole, userId: number) {
    const participantField = role === 'CLIENT' ? 'id_cliente' : 'id_trabajador';
    const { data: conversations, error } = await this.client
      .from('v_resumen_conversaciones')
      .select('*')
      .eq(participantField, userId)
      .order('ultima_actividad', { ascending: false });

    if (error) throw new BadRequestException(error.message);

    return (conversations || []).map((row: any) => {
      // Intentar obtener el último mensaje de la conversación para la vista previa
      const lastMessage = row.ultimo_mensaje_preview ? {
        id_mensaje: 0, // id dummy ya que no es crucial para el preview del frontend
        id_conversacion: row.id_conversacion,
        contenido_mensaje: row.ultimo_mensaje_preview,
        fecha_mensaje: row.ultima_actividad,
      } : null;

      return {
        id_conversacion: row.id_conversacion,
        id_cliente: row.id_cliente,
        id_trabajador: row.id_trabajador,
        id_publi: row.id_publi,
        id_postulacion: row.id_postulacion,
        estado_conversacion: row.estado_conversacion,
        ultimo_mensaje_preview: row.ultimo_mensaje_preview,
        ultima_actividad: row.ultima_actividad,
        fecha_creacion: row.fecha_creacion,
        unread_count: role === 'CLIENT' ? row.unread_count_cliente : row.unread_count_trabajador,
        counterpart_name: role === 'CLIENT' ? row.trabajador_nombre : row.cliente_nombre,
        counterpart_avatar: role === 'CLIENT' ? row.trabajador_avatar : row.cliente_avatar,
        counterpart_score: role === 'CLIENT' ? row.trabajador_puntuacion : null,
        last_message: lastMessage,
        contract: row.id_contratacion ? {
          id_contratacion: row.id_contratacion,
          id_conversacion: row.id_conversacion,
          id_cliente: row.id_cliente,
          id_trabajador: row.id_trabajador,
          estado_contratacion: row.estado_contratacion,
          monto: row.monto,
          fecha_hora: row.fecha_hora,
          direccion: row.direccion,
          descripcion: row.descripcion,
          materiales_incluidos: row.materiales_incluidos,
          descripcion_materiales: row.descripcion_materiales,
          // Legacy mappings
          monto_acordado: row.monto_acordado,
          precio_final_acordado: row.precio_final_acordado,
          fecha_horario_acordado: row.fecha_horario_acordado,
          direccion_o_zona: row.direccion_o_zona,
          condiciones_especiales: row.condiciones_especiales,
          detalle_acuerdo: row.detalle_acuerdo,
        } : null,
      };
    });
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
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);

    // Actualizar la última actividad de la conversación
    await this.client
      .from('conversaciones')
      .update({
        ultimo_mensaje_preview: content.slice(0, 160),
        ultima_actividad: new Date().toISOString(),
      })
      .eq('id_conversacion', conversationId);

    // Obtener contraparte para notificar
    const { data: conv } = await this.client
      .from('conversaciones')
      .select('id_cliente, id_trabajador')
      .eq('id_conversacion', conversationId)
      .single();

    if (conv) {
      const destinatario = senderRole === 'CLIENT'
        ? { id_usuario: conv.id_trabajador, tipo_usuario: 'WORKER' }
        : { id_usuario: conv.id_cliente, tipo_usuario: 'CLIENT' };
      
      await this.messageNotifier.notify({ message, destinatarios: [destinatario] });
    }

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
    if (!data) return null;
    return {
      ...data,
      monto: data.monto_acordado,
      fecha_hora: data.fecha_horario_acordado,
      direccion: data.direccion_o_zona,
      descripcion: data.detalle_acuerdo,
    };
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
    
    let nextStatus = 'Pendiente';
    let shouldCloseConversation = false;
    let fechaConfirmacion: string | null = null;
    let fechaRechazo: string | null = null;

    if (data.action === ContractAction.CONFIRM) {
      nextStatus = 'Confirmada';
      shouldCloseConversation = true;
      fechaConfirmacion = now;
    } else if (data.action === ContractAction.REJECT) {
      nextStatus = 'Rechazada';
      shouldCloseConversation = true;
      fechaRechazo = now;
    } else if (data.action === ContractAction.INTENT) {
      nextStatus = 'IntencionCliente';
    } else if (data.action === ContractAction.CANCEL_INTENT) {
      nextStatus = 'Pendiente';
    } else if (data.action === ContractAction.CANCEL_PROPOSAL) {
      nextStatus = 'IntencionCliente';
    } else if (data.action === ContractAction.CANCEL_CONFIRMED) {
      if (existingContract.estado_contratacion !== 'Confirmada') {
        throw new BadRequestException('Solo se pueden cancelar contratos que estén confirmados');
      }
      const fechaAcordada = existingContract.fecha_horario_acordado;
      if (fechaAcordada) {
        const timeDiff = new Date(fechaAcordada).getTime() - Date.now();
        if (timeDiff < 60 * 60 * 1000) {
          throw new BadRequestException('No se puede cancelar el contrato con menos de 1 hora de anticipación a la fecha acordada');
        }
      }
      nextStatus = 'Cancelada';
      fechaRechazo = now;
    } else if (data.action === ContractAction.FINALIZE) {
      if (existingContract.estado_contratacion !== 'Confirmada') {
        throw new BadRequestException('Solo se pueden finalizar contratos que estén confirmados (en curso)');
      }
      nextStatus = 'Finalizada';
      shouldCloseConversation = true;
      fechaConfirmacion = now;
    }

    const updatePayload: Record<string, any> = {
      estado_contratacion: nextStatus,
      detalle_acuerdo: data.note || existingContract.detalle_acuerdo || null,
      fecha_confirmacion: fechaConfirmacion || existingContract.fecha_confirmacion || null,
      fecha_rechazo: fechaRechazo || existingContract.fecha_rechazo || null,
    };

    if (data.action === ContractAction.INTENT) {
      updatePayload.monto_acordado = null;
      updatePayload.precio_final_acordado = null;
      updatePayload.fecha_horario_acordado = null;
      updatePayload.direccion_o_zona = null;
      updatePayload.condiciones_especiales = null;
      updatePayload.detalle_acuerdo = null;
      updatePayload.fecha_confirmacion = null;
      updatePayload.fecha_rechazo = null;
      updatePayload.materiales_incluidos = null;
      updatePayload.descripcion_materiales = null;
    }
    const { data: updatedContract, error } = await this.client
      .from('contrataciones')
      .update(updatePayload)
      .eq('id_contratacion', existingContract.id_contratacion)
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);

    // Si la contratación fue confirmada, cambiamos el estado de la publicación a 'En curso'
    if (data.action === ContractAction.CONFIRM) {
      const { data: convData } = await this.client
        .from('conversaciones')
        .select('id_publi, id_trabajador')
        .eq('id_conversacion', conversationId)
        .single();
      
      if (convData?.id_publi) {
        const { error: pubError } = await this.client
          .from('publicaciones')
          .update({ estado_publi: 'En curso' })
          .eq('id_publi', convData.id_publi);
        
        if (pubError) {
          console.error(`[JobsService] Error al actualizar publicación ${convData.id_publi} a En curso:`, pubError.message);
        } else {
          console.log(`[JobsService] Publicación ${convData.id_publi} en curso exitosamente.`);

          // Notify other workers
          const { data: postulates } = await this.client
            .from('postulaciones')
            .select('id_trabajador')
            .eq('id_publi', convData.id_publi)
            .neq('id_trabajador', convData.id_trabajador);

          if (postulates && postulates.length > 0) {
            const destinatarios = postulates.map((p: any) => p.id_trabajador);
            await this.jobPostingNotifier.notify({ 
               post: { id_publi: convData.id_publi }, 
               action: 'CLOSED', 
               destinatarios 
            });
          }
        }
      }
    }

    // Si la contratación fue finalizada, cambiamos el estado de la publicación a 'Concretada'
    if (data.action === ContractAction.FINALIZE) {
      const { data: convData } = await this.client
        .from('conversaciones')
        .select('id_publi')
        .eq('id_conversacion', conversationId)
        .single();
      
      if (convData?.id_publi) {
        const { error: pubError } = await this.client
          .from('publicaciones')
          .update({ estado_publi: 'Concretada' })
          .eq('id_publi', convData.id_publi);
        
        if (pubError) {
          console.error(`[JobsService] Error al actualizar publicación ${convData.id_publi} a Concretada:`, pubError.message);
        } else {
          console.log(`[JobsService] Publicación ${convData.id_publi} concretada exitosamente.`);
        }
      }
    }

    const conversationUpdate: Record<string, any> = {
      ultima_actividad: now
    };
    if (shouldCloseConversation) {
      conversationUpdate.estado_conversacion = 'Cerrada';
    } else {
      conversationUpdate.estado_conversacion = 'Activa';
    }

    const { error: conversationError } = await this.client
      .from('conversaciones')
      .update(conversationUpdate)
      .eq('id_conversacion', conversationId);

    if (conversationError) throw new BadRequestException(conversationError.message);

    // Notificar cambio de estado del contrato
    const { data: conv } = await this.client
      .from('conversaciones')
      .select('id_cliente, id_trabajador')
      .eq('id_conversacion', conversationId)
      .single();

    if (conv) {
      const destinatario = actorRole === 'CLIENT'
        ? { id_usuario: conv.id_trabajador, tipo_usuario: 'WORKER' }
        : { id_usuario: conv.id_cliente, tipo_usuario: 'CLIENT' };
      
      await this.contractNotifier.notify({ 
        contract: updatedContract, 
        action: data.action, 
        destinatarios: [destinatario] 
      });
    }

    return {
      ...updatedContract,
      monto: updatedContract.monto_acordado,
      fecha_hora: updatedContract.fecha_horario_acordado,
      direccion: updatedContract.direccion_o_zona,
      descripcion: updatedContract.detalle_acuerdo,
    };
  }

  async submitRatingAndFinalize(
    conversationId: number,
    data: {
      puntuacion: number;
      comentario?: string;
      id_emisor_cliente: number;
      id_receptor_trabajador: number;
    }
  ) {
    if (!data.puntuacion || data.puntuacion < 1 || data.puntuacion > 5) {
      throw new BadRequestException('La puntuación debe ser entre 1 y 5.');
    }
    if (!data.id_emisor_cliente || !data.id_receptor_trabajador) {
      throw new BadRequestException('El emisor y el receptor son requeridos para crear una valoración.');
    }
    if (data.comentario && data.comentario.length > 500) {
      throw new BadRequestException('El comentario no puede exceder los 500 caracteres.');
    }
    if (data.id_emisor_cliente === data.id_receptor_trabajador) {
      throw new BadRequestException('No puedes valorarte a ti mismo.');
    }

    const { data: conv, error: convError } = await this.client
      .from('conversaciones')
      .select('id_cliente, id_trabajador, id_publi')
      .eq('id_conversacion', conversationId)
      .single();

    if (convError || !conv) {
      throw new BadRequestException('Conversación no encontrada o inválida.');
    }

    if (conv.id_cliente !== data.id_emisor_cliente) {
      throw new BadRequestException('El emisor de la valoración no coincide con el cliente de la conversación.');
    }
    if (conv.id_trabajador !== data.id_receptor_trabajador) {
      throw new BadRequestException('El receptor de la valoración no coincide con el trabajador de la conversación.');
    }

    const { data: contract, error: contractError } = await this.client
      .from('contrataciones')
      .select('*')
      .eq('id_conversacion', conversationId)
      .maybeSingle();

    if (contractError || !contract) {
      throw new BadRequestException('No existe una contratación asociada a esta conversación.');
    }

    if (contract.estado_contratacion !== 'Confirmada') {
      throw new BadRequestException('Solo se pueden calificar contratos que estén confirmados.');
    }

    const { data: existingRating, error: ratingCheckErr } = await this.client
      .from('valoraciones')
      .select('id_valoracion')
      .eq('id_emisor_cliente', data.id_emisor_cliente)
      .eq('id_receptor_trabajador', data.id_receptor_trabajador);

    if (ratingCheckErr) {
      throw new BadRequestException('Error al verificar valoración existente.');
    }

    if (existingRating && existingRating.length > 0) {
      throw new BadRequestException('Ya has valorado a este trabajador.');
    }

    const { data: ratingRecord, error: insertError } = await this.client
      .from('valoraciones')
      .insert([
        {
          puntuacion: data.puntuacion,
          comentario: data.comentario?.trim() || null,
          id_emisor_cliente: data.id_emisor_cliente,
          id_receptor_trabajador: data.id_receptor_trabajador,
        }
      ])
      .select()
      .single();

    if (insertError) {
      throw new BadRequestException(`Error al insertar valoración: ${insertError.message}`);
    }

    try {
      const updatedContract = await this.updateContractStatus(conversationId, {
        actorId: data.id_emisor_cliente,
        actorRole: 'CLIENT',
        action: ContractAction.FINALIZE,
        note: contract.detalle_acuerdo || undefined,
      });

      // Enviar mensaje automático en la conversación notificando la finalización
      await this.sendMessage(conversationId, {
        senderId: data.id_emisor_cliente,
        senderRole: 'CLIENT',
        content: '[TRABAJO FINALIZADO] ¡El servicio ha sido marcado como finalizado y concretado con éxito al emitirse la calificación!'
      });

      return {
        rating: ratingRecord,
        contract: updatedContract,
      };
    } catch (finalizeError: any) {
      await this.client
        .from('valoraciones')
        .delete()
        .eq('id_valoracion', ratingRecord.id_valoracion);

      throw new BadRequestException(`Error al finalizar el contrato: ${finalizeError.message}`);
    }
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

    const finalMonto = data.monto !== undefined && data.monto !== null 
      ? Number(data.monto) 
      : (data.precioFinalAcordado !== undefined && data.precioFinalAcordado !== null ? Number(data.precioFinalAcordado) : null);
    
    if (finalMonto !== null && Number.isNaN(finalMonto)) {
      throw new BadRequestException('El monto debe ser numérico');
    }

    const agreementPayload: Record<string, any> = {
      monto_acordado: finalMonto,
      precio_final_acordado: finalMonto,
      
      fecha_horario_acordado: data.fecha_hora || data.fechaHorarioAcordado || null,
      
      direccion_o_zona: data.direccion || data.direccionOZona || null,
      
      condiciones_especiales: data.descripcion || data.condicionesEspeciales || null,
      detalle_acuerdo: data.descripcion || data.detalleAcuerdo || null,

      materiales_incluidos: data.materialesIncluidos ?? null,
      descripcion_materiales: data.descripcion_materiales || null,
      
      estado_contratacion: 'PropuestaEnviada',
    };

    const { data: updatedContract, error } = await this.client
      .from('contrataciones')
      .update(agreementPayload)
      .eq('id_contratacion', existingContract.id_contratacion)
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);

    const previewParts = [
      finalMonto !== null ? `Propuesta $${finalMonto}` : null,
      (data.fecha_hora || data.fechaHorarioAcordado) ? `Fecha ${data.fecha_hora || data.fechaHorarioAcordado}` : null,
      (data.direccion || data.direccionOZona) ? `Zona ${data.direccion || data.direccionOZona}` : null,
    ].filter(Boolean);

    const { error: conversationError } = await this.client
      .from('conversaciones')
      .update({
        ultimo_mensaje_preview: previewParts.join(' | ') || 'Propuesta detallada enviada',
        ultima_actividad: new Date().toISOString(),
      })
      .eq('id_conversacion', conversationId);

    if (conversationError) throw new BadRequestException(conversationError.message);

    // Notificar propuesta de contrato
    const { data: conv } = await this.client
      .from('conversaciones')
      .select('id_cliente, id_trabajador')
      .eq('id_conversacion', conversationId)
      .single();

    if (conv) {
      const destinatario = actorRole === 'CLIENT'
        ? { id_usuario: conv.id_trabajador, tipo_usuario: 'WORKER' }
        : { id_usuario: conv.id_cliente, tipo_usuario: 'CLIENT' };
      
      await this.contractNotifier.notify({ 
        contract: updatedContract, 
        action: 'AGREEMENT_SENT', 
        destinatarios: [destinatario] 
      });
    }

    return {
      ...updatedContract,
      monto: updatedContract.monto_acordado,
      fecha_hora: updatedContract.fecha_horario_acordado,
      direccion: updatedContract.direccion_o_zona,
      descripcion: updatedContract.detalle_acuerdo,
    };
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
    // Ordenar descendente por puntuacion (mayor puntuacion primero, null/0 al final)
    // En caso de empate (ej. sin calificacion), ordenar alfabeticamente por nombre
    const sortedData = (data || []).sort((a, b) => {
      const scoreA = a.puntuacion === null || a.puntuacion === undefined ? 0 : Number(a.puntuacion);
      const scoreB = b.puntuacion === null || b.puntuacion === undefined ? 0 : Number(b.puntuacion);
      if (scoreA === scoreB) {
        const nameA = a.nombre_y_apellido_trabajador || '';
        const nameB = b.nombre_y_apellido_trabajador || '';
        return nameA.localeCompare(nameB);
      }
      return scoreB - scoreA;
    });

    return sortedData;
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
    const normalizedWorkers = allWorkers.map((worker: any) => ({
      ...worker,
      oficios: (worker.oficio_del_trabajador || [])
        .map((item: any) => item?.oficios)
        .filter(Boolean),
      oficio_del_trabajador: undefined, // limpiar raw join
    }));

    // Ordenar descendente por puntuacion (mayor puntuacion primero, null/0 al final)
    // En caso de empate (ej. sin calificacion), ordenar alfabeticamente por nombre
    normalizedWorkers.sort((a, b) => {
      const scoreA = a.puntuacion === null || a.puntuacion === undefined ? 0 : Number(a.puntuacion);
      const scoreB = b.puntuacion === null || b.puntuacion === undefined ? 0 : Number(b.puntuacion);
      if (scoreA === scoreB) {
        const nameA = a.nombre_y_apellido_trabajador || '';
        const nameB = b.nombre_y_apellido_trabajador || '';
        return nameA.localeCompare(nameB);
      }
      return scoreB - scoreA;
    });

    return normalizedWorkers;
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
        url_dni_frente_trabajador,
        fecha_actualizacion_dni,
        certificado_trabajador,
        fecha_actualizacion_antecedentes,
        certificados,
        fecha_actualizacion_certificados,
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
      url_dni_frente_trabajador: worker.url_dni_frente_trabajador,
      fecha_actualizacion_dni: worker.fecha_actualizacion_dni,
      certificado_trabajador: worker.certificado_trabajador,
      fecha_actualizacion_antecedentes: worker.fecha_actualizacion_antecedentes,
      certificados: worker.certificados,
      fecha_actualizacion_certificados: worker.fecha_actualizacion_certificados,
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
    
    // Solución N+1: Obtener trabajadores aquí y pasarlos al notificador
    const { data: workers } = await this.client
      .from('oficio_del_trabajador')
      .select('id_trabajador')
      .eq('id_oficio', post.id_oficio);

    const destinatarios = workers ? workers.map(w => w.id_trabajador) : [];

    // Notificar a los trabajadores interesados
    await this.jobPostingNotifier.notify({ post, destinatarios });
    
    return post;
  }

  async getPosts(clientId?: number, tradeId?: number, workerId?: number) {
    let workerTradeIds: number[] = [];
    let postulatedPostIds: number[] = [];

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

      // Obtener las publicaciones a las que ya se ha postulado
      const { data: workerPostulations } = await this.client
        .from('postulaciones')
        .select('id_publi')
        .eq('id_trabajador', workerId);
      
      postulatedPostIds = (workerPostulations || []).map((p: any) => p.id_publi);
    }

    let query = this.client
      .from('publicaciones')
      .select('*, oficios(*), clientes(*)');

    if (clientId) query = query.eq('id_cliente', clientId);
    if (tradeId) query = query.eq('id_oficio', tradeId);
    if (workerTradeIds.length > 0) query = query.in('id_oficio', workerTradeIds);
    
    if (workerId) {
      if (postulatedPostIds.length > 0) {
        query = query.or(`estado_publi.eq.Abierta,id_publi.in.(${postulatedPostIds.join(',')})`);
      } else {
        query = query.eq('estado_publi', 'Abierta');
      }
    }
    
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

    // Verificar que la publicación exista y que su estado sea 'Abierta'
    const { data: post, error: postError } = await this.client
      .from('publicaciones')
      .select('estado_publi')
      .eq('id_publi', id_publi)
      .maybeSingle();

    if (postError) {
      throw new BadRequestException(`Error al verificar la publicación: ${postError.message}`);
    }
    if (!post) {
      throw new BadRequestException('La publicación no existe');
    }
    if (post.estado_publi !== 'Abierta') {
      throw new BadRequestException('La publicación ya no está abierta para recibir presupuestos');
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

    // 1. Obtener el registro actual para comparar
    const { data: currentUser, error: fetchError } = await this.client
      .from(table)
      .select('*')
      .eq(idField, id)
      .single();

    if (fetchError) throw new BadRequestException(`Error al obtener perfil actual: ${fetchError.message}`);

    const now = new Date().toISOString();

    // 2. Comparar campos clave y asignar fecha de actualización si cambiaron
    if (updates.url_foto_perfil !== undefined && updates.url_foto_perfil !== currentUser.url_foto_perfil) {
      updates.fecha_actualizacion_foto = now;
    }

    if (role === 'CLIENT') {
      // DNI para clientes
      if ((updates.url_dni_frente !== undefined && updates.url_dni_frente !== currentUser.url_dni_frente) || 
          (updates.url_dni_dorso !== undefined && updates.url_dni_dorso !== currentUser.url_dni_dorso)) {
        updates.fecha_actualizacion_dni = now;
      }
    } else {
      // DNI para trabajadores
      if ((updates.url_dni_frente_trabajador !== undefined && updates.url_dni_frente_trabajador !== currentUser.url_dni_frente_trabajador) || 
          (updates.url_dni_reverso_trabajador !== undefined && updates.url_dni_reverso_trabajador !== currentUser.url_dni_reverso_trabajador)) {
        updates.fecha_actualizacion_dni = now;
        console.log('[updateProfile] Updated DNI date');
      }

      // Certificados de buena conducta (antecedentes)
      console.log(`[updateProfile] Buena Conducta: updates=${updates.certificado_trabajador}, current=${currentUser.certificado_trabajador}`);
      if (updates.certificado_trabajador !== undefined && updates.certificado_trabajador !== currentUser.certificado_trabajador) {
        updates.fecha_actualizacion_antecedentes = now;
        console.log('[updateProfile] Updated Antecedentes date');
      }

      // Certificados JSONB
      if (updates.certificados !== undefined) {
        const currentCertsStr = JSON.stringify(currentUser.certificados || []);
        const newCertsStr = JSON.stringify(updates.certificados || []);
        console.log(`[updateProfile] Certificados JSON: current=${currentCertsStr}, new=${newCertsStr}`);
        if (currentCertsStr !== newCertsStr) {
          updates.fecha_actualizacion_certificados = now;
          console.log('[updateProfile] Updated Certificados date');
        }
      }
    }

    // 3. Ejecutar actualización
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

  async getContractHistory(userId: number, role: string) {
    const isClient = role.toLowerCase() === 'cliente' || role.toUpperCase() === 'CLIENT';
    const participantField = isClient ? 'id_cliente' : 'id_trabajador';
    const counterpartRelation = isClient ? 'trabajadores' : 'clientes';

    const { data, error } = await this.client
      .from('contrataciones')
      .select(`
        *,
        conversaciones (id_publi, id_postulacion),
        counterpart: ${counterpartRelation} (*)
      `)
      .eq(participantField, userId);

    if (error) {
      throw new BadRequestException(`Error al obtener historial de contratos: ${error.message}`);
    }

    return (data || []).map((row: any) => {
      const counterpartName = isClient
        ? row.counterpart?.nombre_y_apellido_trabajador
        : row.counterpart?.nombre_y_apellido_cliente;
      
      const counterpartAvatar = row.counterpart?.url_foto_perfil || null;

      return {
        id_contratacion: row.id_contratacion,
        id_conversacion: row.id_conversacion,
        id_cliente: row.id_cliente,
        id_trabajador: row.id_trabajador,
        estado_contratacion: row.estado_contratacion,
        monto_acordado: row.monto_acordado,
        precio_final_acordado: row.precio_final_acordado,
        fecha_horario_acordado: row.fecha_horario_acordado,
        materiales_incluidos: row.materiales_incluidos,
        direccion_o_zona: row.direccion_o_zona,
        condiciones_especiales: row.condiciones_especiales,
        detalle_acuerdo: row.detalle_acuerdo,
        fecha_solicitud: row.fecha_solicitud,
        fecha_confirmacion: row.fecha_confirmacion,
        fecha_rechazo: row.fecha_rechazo,
        counterpart_name: counterpartName ?? 'Usuario YacaJobs',
        counterpart_avatar: counterpartAvatar,
        id_publi: row.conversaciones?.id_publi || null,
        id_postulacion: row.conversaciones?.id_postulacion || null,
      };
    });
  }

  async closePostManual(postId: number, clientId: number) {
    // 1. Verificar que la publicación exista
    const { data: post, error: fetchError } = await this.client
      .from('publicaciones')
      .select('*')
      .eq('id_publi', postId)
      .maybeSingle();

    if (fetchError) throw new BadRequestException(fetchError.message);
    if (!post) throw new BadRequestException('La publicación no existe');

    // 2. Validar propiedad
    if (post.id_cliente !== clientId) {
      throw new BadRequestException('No tienes permiso para cerrar esta publicación');
    }

    // 3. Validar estado
    if (post.estado_publi !== 'Abierta') {
      throw new BadRequestException('La publicación ya se encuentra cerrada');
    }

    // 4. Actualizar estado a Cancelada
    const { data: updatedPost, error: updateError } = await this.client
      .from('publicaciones')
      .update({ estado_publi: 'Cancelada' })
      .eq('id_publi', postId)
      .select()
      .single();

    if (updateError) throw new BadRequestException(updateError.message);

    // Notify ALL workers who postulated
    const { data: postulates } = await this.client
      .from('postulaciones')
      .select('id_trabajador')
      .eq('id_publi', postId);

    if (postulates && postulates.length > 0) {
      const destinatarios = postulates.map((p: any) => p.id_trabajador);
      await this.jobPostingNotifier.notify({ 
         post: { id_publi: postId }, 
         action: 'CLOSED', 
         destinatarios 
      });
    }

    return updatedPost;
  }

  async getClientProfile(clientId: number) {
    const { data: client, error } = await this.client
      .from('clientes')
      .select('id_cliente, nombre_y_apellido_cliente, correo_cliente, celular_cliente, fecha_registro, url_foto_perfil, url_dni_frente, url_dni_dorso, fecha_actualizacion_dni')
      .eq('id_cliente', clientId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(`Error al obtener el perfil del cliente: ${error.message}`);
    }

    if (!client) {
      throw new BadRequestException('El perfil del cliente no existe');
    }

    return client;
  }
}
