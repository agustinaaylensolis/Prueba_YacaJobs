import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';

@Injectable()
export class AdminService {
  constructor(@Inject(SupabaseService) private readonly supabaseService: SupabaseService) {}

  private get client() {
    return this.supabaseService.getClient();
  }

  async getMetrics() {
    const [
      { count: clientCount, error: clientErr },
      { count: workerCount, error: workerErr },
      { count: activeContracts, error: activeErr },
      { count: completedContracts, error: completedErr }
    ] = await Promise.all([
      this.client.from('clientes').select('*', { count: 'exact', head: true }),
      this.client.from('trabajadores').select('*', { count: 'exact', head: true }),
      this.client.from('contrataciones').select('*', { count: 'exact', head: true }).eq('estado_contratacion', 'Confirmada'),
      this.client.from('contrataciones').select('*', { count: 'exact', head: true }).eq('estado_contratacion', 'Finalizada')
    ]);

    if (clientErr) console.error('Error fetching client count:', clientErr.message);
    if (workerErr) console.error('Error fetching worker count:', workerErr.message);
    if (activeErr) console.error('Error fetching active contracts count:', activeErr.message);
    if (completedErr) console.error('Error fetching completed contracts count:', completedErr.message);

    return {
      totalUsers: (clientCount || 0) + (workerCount || 0),
      activeContracts: activeContracts || 0,
      completedContracts: completedContracts || 0
    };
  }

  async getUsers() {
    const [
      { data: clients, error: clientsError },
      { data: workers, error: workersError }
    ] = await Promise.all([
      this.client.from('clientes').select('*'),
      this.client.from('trabajadores').select('*')
    ]);

    if (clientsError) throw new BadRequestException(clientsError.message);
    if (workersError) throw new BadRequestException(workersError.message);

    const mappedClients = (clients || []).map(c => ({
      id: c.id_cliente,
      nombre: c.nombre_y_apellido_cliente,
      correo: c.correo_cliente,
      rol: 'CLIENT',
      celular: c.celular_cliente,
      suspendido: c.suspendido ?? false,
      fecha_registro: c.fecha_registro,
      url_dni_frente: c.url_dni_frente,
      url_dni_dorso: c.url_dni_dorso,
    }));

    const mappedWorkers = (workers || []).map(w => ({
      id: w.id_trabajador,
      nombre: w.nombre_y_apellido_trabajador,
      correo: w.correo_trabajador,
      rol: 'WORKER',
      celular: w.nro_celular_trabajador,
      suspendido: w.suspendido ?? false,
      fecha_registro: w.fecha_registro,
      url_dni_frente: w.url_dni_frente_trabajador,
      url_dni_dorso: w.url_dni_reverso_trabajador,
      certificado_buena_conducta: w.certificado_trabajador,
      monotributo: w.monotributo_trabajador,
      matricula: w.matricula_trabajador,
    }));

    return [...mappedClients, ...mappedWorkers];
  }

  async toggleUserSuspension(rol: 'CLIENT' | 'WORKER', id: number, suspendido: boolean) {
    const table = rol === 'CLIENT' ? 'clientes' : 'trabajadores';
    const idField = rol === 'CLIENT' ? 'id_cliente' : 'id_trabajador';

    const { data, error } = await this.client
      .from(table)
      .update({ suspendido })
      .eq(idField, id)
      .select()
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new BadRequestException('Usuario no encontrado');
    return { success: true, message: `Usuario ${suspendido ? 'suspendido' : 'activado'} exitosamente` };
  }

  async getOficios() {
    const { data, error } = await this.client.from('oficios').select('*').order('nombre_oficio');
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async createOficio(nombre: string, especialidad?: string) {
    const { data, error } = await this.client
      .from('oficios')
      .insert({ nombre_oficio: nombre, especialidad_oficio: especialidad || null })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateOficio(id: number, nombre: string, especialidad?: string) {
    const { data, error } = await this.client
      .from('oficios')
      .update({ nombre_oficio: nombre, especialidad_oficio: especialidad || null })
      .eq('id_oficio', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async deleteOficio(id: number) {
    // Delete worker relations first
    const { error: relError } = await this.client
      .from('oficio_del_trabajador')
      .delete()
      .eq('id_oficio', id);

    if (relError) throw new BadRequestException(`Error al eliminar relaciones de oficio: ${relError.message}`);

    const { data, error } = await this.client
      .from('oficios')
      .delete()
      .eq('id_oficio', id)
      .select()
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    return { success: true, message: 'Oficio eliminado exitosamente' };
  }

  async getPublications() {
    const { data, error } = await this.client
      .from('publicaciones')
      .select('*, clientes(nombre_y_apellido_cliente), oficios(nombre_oficio)')
      .order('fecha_publi', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async forceClosePublication(id: number) {
    const { data, error } = await this.client
      .from('publicaciones')
      .update({ estado_publi: 'Cancelada' })
      .eq('id_publi', id)
      .select()
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new BadRequestException('Publicación no encontrada');
    return { success: true, message: 'Publicación cerrada forzosamente' };
  }

  async getConversaciones() {
    const { data, error } = await this.client
      .from('conversaciones')
      .select(`
        *,
        clientes(nombre_y_apellido_cliente, correo_cliente),
        trabajadores(nombre_y_apellido_trabajador, correo_trabajador),
        publicaciones(descripcion_publi),
        contrataciones(*)
      `)
      .order('ultima_actividad', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getConversationMessages(id: number) {
    const { data, error } = await this.client
      .from('mensajes')
      .select('*')
      .eq('id_conversacion', id)
      .order('fecha_mensaje', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateContractStatusForce(id: number, estado: string) {
    const { data, error } = await this.client
      .from('contrataciones')
      .update({ estado_contratacion: estado })
      .eq('id_contratacion', id)
      .select()
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new BadRequestException('Contratación no encontrada');
    return { success: true, message: `Estado del contrato cambiado a ${estado}` };
  }
}
