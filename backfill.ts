import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function backfill() {
  console.log('Fetching trabajadores...');
  const { data: trabajadores, error } = await supabase.from('trabajadores').select('*');
  if (error) {
    console.error('Error fetching', error);
    return;
  }

  for (const t of trabajadores) {
    const updates: Record<string, any> = {};
    if (t.url_foto_perfil && !t.fecha_actualizacion_foto) updates.fecha_actualizacion_foto = t.fecha_registro;
    if (t.url_dni_frente_trabajador && !t.fecha_actualizacion_dni) updates.fecha_actualizacion_dni = t.fecha_registro;
    if (t.certificado_trabajador && !t.fecha_actualizacion_antecedentes) updates.fecha_actualizacion_antecedentes = t.fecha_registro;
    
    if (t.certificados && Array.isArray(t.certificados) && t.certificados.length > 0 && !t.fecha_actualizacion_certificados) {
      updates.fecha_actualizacion_certificados = t.fecha_registro;
    }

    if (Object.keys(updates).length > 0) {
      console.log(`Updating ${t.id_trabajador} with`, updates);
      await supabase.from('trabajadores').update(updates).eq('id_trabajador', t.id_trabajador);
    }
  }

  console.log('Fetching clientes...');
  const { data: clientes } = await supabase.from('clientes').select('*');
  for (const c of clientes || []) {
    const updates: Record<string, any> = {};
    if (c.url_foto_perfil && !c.fecha_actualizacion_foto) updates.fecha_actualizacion_foto = c.fecha_registro;
    if (c.url_dni_frente && !c.fecha_actualizacion_dni) updates.fecha_actualizacion_dni = c.fecha_registro;
    
    if (Object.keys(updates).length > 0) {
      console.log(`Updating client ${c.id_cliente} with`, updates);
      await supabase.from('clientes').update(updates).eq('id_cliente', c.id_cliente);
    }
  }

  console.log('Backfill completed.');
}

backfill();
