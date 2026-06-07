import React, { useState, useEffect, useMemo } from 'react';
import { Clock3, CheckCircle2, XCircle, FileText, Download, Loader2, MapPin, CalendarDays } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { supabase } from '../lib/supabase';

interface HistoryTabProps {
  user: {
    id_cliente?: number;
    id_trabajador?: number;
    name?: string;
  };
  role: 'CLIENT' | 'WORKER';
}

export default function HistoryTab({ user, role }: HistoryTabProps) {
  const [contracts, setContracts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'completed' | 'cancelled'>('active');

  const userId = role === 'CLIENT' ? user.id_cliente : user.id_trabajador;

  const fetchHistory = async () => {
    if (!userId) return;
    try {
      setIsLoading(true);
      setError('');
      const res = await fetch(`/api/jobs/history?userId=${userId}&role=${role}`);
      if (!res.ok) {
        throw new Error('No se pudo cargar el historial de contratos');
      }
      const data = await res.json();
      setContracts(data);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al cargar el historial.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, role]);

  // Suscripción a Supabase Realtime para cambios en contrataciones
  useEffect(() => {
    if (!userId) return;

    const roleStr = role === 'CLIENT' ? 'CLIENT' : 'WORKER';
    const channel = supabase
      .channel(`contrataciones_history_${roleStr}_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contrataciones',
        },
        () => {
          // Recargar el historial ante cualquier inserción, actualización o borrado
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, role]);

  // Clasificación estricta de contratos por su estado actual
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      const status = c.estado_contratacion;
      if (activeSubTab === 'active') {
        return status === 'Confirmada';
      } else if (activeSubTab === 'completed') {
        return status === 'Finalizada' || status === 'Completada';
      } else if (activeSubTab === 'cancelled') {
        return status === 'Cancelada';
      }
      return false;
    });
  }, [contracts, activeSubTab]);

  const generatePDF = (contract: any) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const primaryGreen = [46, 125, 50]; // #2E7D32
    const slateDark = [30, 41, 59]; // slate-800
    const softBg = [240, 244, 241]; // #F0F4F1

    // Header Background
    doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.rect(0, 0, 210, 45, 'F');

    // Branding Logo & Name
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.text('YacaJobs', 15, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Plataforma Digital de Oficios y Servicios de Confianza', 15, 28);

    // Meta Details on Header (Right side)
    doc.setFontSize(9);
    doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, 140, 18);
    doc.text(`ID Contratación: #${contract.id_contratacion}`, 140, 24);
    doc.text(`Estado del Contrato: ${contract.estado_contratacion.toUpperCase()}`, 140, 30);
    doc.text(`Código de Validez: YJ-${contract.id_contratacion}-${contract.id_conversacion}`, 140, 36);

    let yPos = 60;

    // Section Title: Información General
    doc.setFillColor(softBg[0], softBg[1], softBg[2]);
    doc.rect(15, yPos, 180, 8, 'F');
    doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('RESUMEN GENERAL DEL TRABAJO', 18, yPos + 6);

    yPos += 16;

    // Body Text Settings
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.setFontSize(10);

    // Counterpart Label & Name
    doc.setFont('helvetica', 'bold');
    doc.text(role === 'CLIENT' ? 'Profesional contratado:' : 'Cliente contratante:', 15, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(contract.counterpart_name || 'N/A', 65, yPos);

    yPos += 8;

    // Pricing
    doc.setFont('helvetica', 'bold');
    doc.text('Monto Final Acordado:', 15, yPos);
    doc.setFont('helvetica', 'normal');
    const priceVal = contract.precio_final_acordado ?? contract.monto_acordado ?? '0.00';
    doc.text(`$${priceVal} ARS`, 65, yPos);

    yPos += 8;

    // Schedule
    doc.setFont('helvetica', 'bold');
    doc.text('Fecha y Hora Pactadas:', 15, yPos);
    doc.setFont('helvetica', 'normal');
    const dateStr = contract.fecha_horario_acordado
      ? new Date(contract.fecha_horario_acordado).toLocaleString()
      : 'No definida';
    doc.text(dateStr, 65, yPos);

    yPos += 8;

    // Location
    doc.setFont('helvetica', 'bold');
    doc.text('Zona / Dirección de Trabajo:', 15, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(contract.direccion_o_zona || 'No especificada', 65, yPos);

    yPos += 14;

    // Section Title: Detalles del Acuerdo
    doc.setFillColor(softBg[0], softBg[1], softBg[2]);
    doc.rect(15, yPos, 180, 8, 'F');
    doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLES Y CONDICIONES ESPECIFICADAS', 18, yPos + 6);

    yPos += 16;

    // Text Wrapping for Description
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.setFont('helvetica', 'normal');
    const descContent = contract.detalle_acuerdo || contract.condiciones_especiales || 'No se registraron comentarios especiales de acuerdo.';
    const splitDesc = doc.splitTextToSize(descContent, 172);
    doc.text(splitDesc, 15, yPos);

    yPos += (splitDesc.length * 5) + 12;

    // Section Title: Materiales e Insumos
    doc.setFillColor(softBg[0], softBg[1], softBg[2]);
    doc.rect(15, yPos, 180, 8, 'F');
    doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('PROVISIÓN DE MATERIALES', 18, yPos + 6);

    yPos += 16;

    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(
      contract.materiales_incluidos ? 'Materiales e insumos INCLUIDOS en el presupuesto acordado.' : 'Materiales NO INCLUIDOS (a cargo del cliente / provisionados de forma externa).',
      15,
      yPos
    );

    if (contract.materiales_incluidos && contract.descripcion_materiales) {
      yPos += 8;
      doc.setFont('helvetica', 'bold');
      doc.text('Descripción de Materiales Acordados:', 15, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      const splitMats = doc.splitTextToSize(contract.descripcion_materiales, 172);
      doc.text(splitMats, 15, yPos);
      yPos += (splitMats.length * 5);
    }

    // Divider Line above footer
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 270, 195, 270);

    // Footer Info
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text('Este documento digital sirve como comprobante de los términos acordados a través del foro y el chat de YacaJobs.', 15, 276);
    doc.text('Para consultas o soporte, escribe a soporte@yacajobs.com.', 15, 281);

    // Save
    doc.save(`Comprobante_YacaJobs_Contrato_${contract.id_contratacion}.pdf`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Confirmada':
        return <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-800">En Curso</span>;
      case 'Finalizada':
      case 'Completada':
        return <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800">Concretado</span>;
      case 'Cancelada':
        return <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-rose-100 text-rose-800">Cancelado</span>;
      default:
        return <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-3xl font-bold text-primary">Historial de Trabajos</h2>
          <p className="text-sm text-slate-500">Consulta y descarga los comprobantes de tus contratos formalizados.</p>
        </div>

        {/* Pestañas de Historial */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border gap-1 self-start">
          <button
            onClick={() => setActiveSubTab('active')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'active' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock3 className="w-3.5 h-3.5 text-amber-500" />
            En Curso
          </button>
          <button
            onClick={() => setActiveSubTab('completed')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'completed' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Concretados
          </button>
          <button
            onClick={() => setActiveSubTab('cancelled')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'cancelled' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
            Cancelados
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
          <p className="text-sm text-slate-400 mt-2 font-semibold">Cargando historial...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-200 font-bold text-center">
          {error}
        </div>
      ) : filteredContracts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredContracts.map((c) => (
            <div key={c.id_contratacion} className="soft-card p-6 border border-slate-100 bg-white hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {c.counterpart_name?.[0] || 'U'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{c.counterpart_name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {role === 'CLIENT' ? 'Profesional de Oficio' : 'Cliente'}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(c.estado_contratacion)}
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-500">Monto Acordado:</span>
                    <span className="font-bold text-primary">${c.precio_final_acordado ?? c.monto_acordado ?? '0.00'}</span>
                  </div>
                  {c.fecha_horario_acordado && (
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-500 flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> Fecha:</span>
                      <span className="font-semibold">{new Date(c.fecha_horario_acordado).toLocaleString()}</span>
                    </div>
                  )}
                  {c.direccion_o_zona && (
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-500 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Zona:</span>
                      <span className="font-semibold truncate max-w-[180px]">{c.direccion_o_zona}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Detalles del Acuerdo</span>
                  <p className="text-xs text-slate-600 italic bg-slate-50 p-3 rounded-xl line-clamp-3">
                    "{c.detalle_acuerdo || c.condiciones_especiales || 'Sin especificaciones adicionales.'}"
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Materiales</span>
                  <p className="text-xs font-semibold text-slate-700">
                    {c.materiales_incluidos ? (
                      <span className="text-emerald-700">✓ Incluidos: {c.descripcion_materiales || 'Sí'}</span>
                    ) : (
                      <span className="text-slate-500">✗ No incluidos en el presupuesto</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t flex gap-2">
                <button
                  onClick={() => generatePDF(c)}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-white hover:opacity-90 font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Descargar Comprobante
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center border-2 border-dashed border-slate-200 rounded-3xl space-y-3">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-slate-400 font-semibold text-sm">
            {activeSubTab === 'active' && 'No tienes contratos en curso actualmente.'}
            {activeSubTab === 'completed' && 'No registras contratos concretados.'}
            {activeSubTab === 'cancelled' && 'No registras contratos cancelados.'}
          </p>
        </div>
      )}
    </div>
  );
}
