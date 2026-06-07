import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Briefcase, User, LogOut, ChevronRight, FileText, CheckCircle2, Star, ShieldCheck, MapPin, ChevronLeft, Loader2, CalendarDays, Mail, Phone, MessageSquare, Send, Inbox, Bell, X, RefreshCw, Clock3, Circle } from 'lucide-react';
import RatingStars from './components/RatingStars';
import { getWorkerRatings, createWorkerRating } from './lib/ratings';
import { Rating } from './types';
import { COLORS } from './constants';
import { UserRole } from './types';
import { supabase } from './lib/supabase';
import { SearchStrategyFactory } from './strategies/SearchStrategyFactory';
import HistoryTab from './components/HistoryTab';

// --- Interfaces ---
export interface Notification {
  id_notificacion: number;
  id_usuario: number;
  tipo_usuario: string;
  titulo: string;
  mensaje: string;
  id_publi?: number;
  leido: boolean;
  seccion_destino?: string;
  fecha_creacion: string;
}

// --- Hooks ---
export const useNotifications = (userId: number | undefined, role: UserRole) => {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    const parsedUserId = userId ? Number(userId) : undefined;
    if (!parsedUserId || !Number.isFinite(parsedUserId)) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('id_usuario', parsedUserId)
        .eq('tipo_usuario', role)
        .order('fecha_creacion', { ascending: false })
        .limit(20);

      if (!error && data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.leido).length);
      }
    };

    // Initial fetch
    fetchNotifications();

    // Setup polling fallback (every 10 seconds)
    const intervalId = setInterval(fetchNotifications, 10000);

    const roleStr = role === UserRole.CLIENT ? 'CLIENT' : 'WORKER';

    // Setup Realtime subscription for all changes (*)
    const channel = supabase
      .channel(`notificaciones_changes_${roleStr}_${parsedUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notificaciones',
          filter: `id_usuario=eq.${parsedUserId}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [userId, role]);

  const markAsRead = async (id: number) => {
    const { error } = await supabase.from('notificaciones').update({ leido: true }).eq('id_notificacion', id);
    if (!error) {
      setNotifications(prev => prev.map(n => n.id_notificacion === id ? { ...n, leido: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.leido).map(n => n.id_notificacion);
    if (unreadIds.length === 0) return;
    const { error } = await supabase.from('notificaciones').update({ leido: true }).in('id_notificacion', unreadIds);
    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, leido: true })));
      setUnreadCount(0);
    }
  };

  const markSectionAsRead = async (section: string) => {
    const unreadIds = notifications.filter(n => !n.leido && n.seccion_destino === section).map(n => n.id_notificacion);
    if (unreadIds.length === 0) return;
    const { error } = await supabase.from('notificaciones').update({ leido: true }).in('id_notificacion', unreadIds);
    if (!error) {
      setNotifications(prev => prev.map(n => unreadIds.includes(n.id_notificacion) ? { ...n, leido: true } : n));
      setUnreadCount(prev => Math.max(0, prev - unreadIds.length));
    }
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead, markSectionAsRead };
};

// --- Sub-components ---

const Logo = ({ variant = 1 }: { variant?: 1 | 2 }) => (
  <div className="flex items-center gap-2">
    <div className={`w-10 h-10 bg-primary rounded-2xl flex items-center justify-center p-1`}>
      <img src="/images/logo1.png" alt="Logo" className="w-full h-full object-contain" onError={(e) => {
        // accion alternativa si la imagen no carga
        e.currentTarget.src = "/images/logo1.png";
      }} />
    </div>
    {variant === 2 && <span className="text-2xl font-bold tracking-tight text-primary">YacaJobs</span>}
  </div>
);

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string; key?: React.Key }) => (
  <div className={`soft-card ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className = "", disabled = false }: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  className?: string;
  disabled?: boolean;
  key?: React.Key;
}) => {
  const variants = {
    primary: `bg-primary text-white hover:opacity-90`,
    secondary: `bg-primary-soft text-primary hover:bg-primary/20`,
    outline: `border-2 border-primary text-primary hover:bg-primary hover:text-white`,
    ghost: `text-muted hover:bg-gray-100`,
  };
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`soft-button cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

type MessageRecord = {
  id_mensaje: number;
  id_conversacion: number;
  id_emisor_cliente?: number | null;
  id_emisor_trabajador?: number | null;
  contenido_mensaje: string;
  leido_por_cliente_at?: string | null;
  leido_por_trabajador_at?: string | null;
  fecha_mensaje: string;
};

type ContractRecord = {
  id_contratacion: number;
  id_conversacion: number;
  id_cliente: number;
  id_trabajador: number;
  estado_contratacion: string;
  monto_acordado?: number | null;
  precio_final_acordado?: number | null;
  fecha_horario_acordado?: string | null;
  materiales_incluidos?: boolean | null;
  direccion_o_zona?: string | null;
  condiciones_especiales?: string | null;
  detalle_acuerdo?: string | null;
  fecha_solicitud?: string | null;
  fecha_confirmacion?: string | null;
  fecha_rechazo?: string | null;
  monto?: number | null;
  fecha_hora?: string | null;
  direccion?: string | null;
  descripcion?: string | null;
  descripcion_materiales?: string | null;
};

type ConversationSummary = {
  id_conversacion: number;
  id_cliente: number;
  id_trabajador: number;
  id_publi?: number | null;
  id_postulacion?: number | null;
  estado_conversacion: string;
  ultimo_mensaje_preview?: string | null;
  ultima_actividad?: string | null;
  fecha_creacion?: string | null;
  unread_count?: number;
  last_message?: MessageRecord | null;
  contract?: ContractRecord | null;
  counterpart_name?: string | null;
  counterpart_avatar?: string | null;
  counterpart_score?: number | null;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  return new Date(value).toLocaleString();
};


const ConversationModal = ({
  open,
  conversation,
  currentRole,
  currentUserId,
  userName,
  onClose,
  onSaved,
}: {
  open: boolean;
  conversation: ConversationSummary | null;
  currentRole: UserRole;
  currentUserId: number;
  userName: string;
  onClose: () => void;
  onSaved?: () => void;
}) => {
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' | null }>({ text: '', type: null });
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [workerContactInfo, setWorkerContactInfo] = useState<{ phone?: string; email?: string } | null>(null);
  const [workerContactLoading, setWorkerContactLoading] = useState(false);

  // Estados del Contrato y Propuestas
  const [currentContract, setCurrentContract] = useState<ContractRecord | null>(conversation?.contract || null);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalFormSending, setProposalFormSending] = useState(false);
  const [proposalNotice, setProposalNotice] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectReasonInput, setShowRejectReasonInput] = useState(false);

  // Estados de Valoración
  const [showCreateRatingForm, setShowCreateRatingForm] = useState(false);
  const [newRating, setNewRating] = useState({ puntuacion: 0, comentario: '' });
  const [newRatingError, setNewRatingError] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [newRatingSuccess, setNewRatingSuccess] = useState('');
  const [hasAlreadyRated, setHasAlreadyRated] = useState(false);

  const [proposalData, setProposalData] = useState({
    fechaHora: '',
    direccion: '',
    descripcion: '',
    monto: '',
    materialesIncluidos: false,
    descripcionMateriales: '',
  });

  const counterpartName = conversation?.counterpart_name || 'Usuario';
  const isClient = currentRole === UserRole.CLIENT;

  const loadThread = async () => {
    if (!conversation) return;
    setIsLoading(true);
    try {
      const messagesRes = await fetch(`/api/jobs/conversations/${conversation.id_conversacion}/messages?role=${currentRole}&userId=${currentUserId}`);
      if (messagesRes.ok) {
        setMessages(await messagesRes.json());
      } else {
        setMessages([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadContract = async () => {
    if (!conversation) return;
    try {
      const res = await fetch(`/api/jobs/conversations/${conversation.id_conversacion}/contract?role=${currentRole}&userId=${currentUserId}`);
      if (res.ok) {
        setCurrentContract(await res.json());
      }
    } catch (e) {
      console.error('Error al cargar el contrato:', e);
    }
  };

  const loadWorkerContact = async () => {
    if (!conversation || !isClient) return;
    if (workerContactInfo) {
      setShowContactInfo((prev) => !prev);
      return;
    }
    setWorkerContactLoading(true);
    try {
      const res = await fetch(`/api/jobs/workers/${conversation.id_trabajador}`);
      if (res.ok) {
        const profile = await res.json();
        setWorkerContactInfo({
          phone: profile.nro_celular_trabajador,
          email: profile.correo_trabajador,
        });
        setShowContactInfo(true);
      }
    } finally {
      setWorkerContactLoading(false);
    }
  };

  const checkExistingRating = async () => {
    if (!isClient || !conversation) return;
    try {
      const { data, error } = await supabase
        .from('valoraciones')
        .select('id_valoracion')
        .eq('id_emisor_cliente', currentUserId)
        .eq('id_receptor_trabajador', conversation.id_trabajador);
      if (!error && data && data.length > 0) {
        setHasAlreadyRated(true);
      } else {
        setHasAlreadyRated(false);
      }
    } catch (e) {
      console.error('Error checking rating:', e);
    }
  };

  const handleCreateWorkerRating = async () => {
    if (newRating.puntuacion < 1 || newRating.puntuacion > 5) {
      setNewRatingError('La puntuación debe ser entre 1 y 5 estrellas.');
      return;
    }
    if (newRating.comentario.length > 500) {
      setNewRatingError('El comentario no puede exceder los 500 caracteres.');
      return;
    }

    setIsSubmittingRating(true);
    setNewRatingError('');
    setNewRatingSuccess('');

    try {
      await createWorkerRating({
        puntuacion: newRating.puntuacion,
        comentario: newRating.comentario.trim() || null,
        id_emisor_cliente: currentUserId,
        id_receptor_trabajador: conversation.id_trabajador,
      });

      setNewRatingSuccess('¡Valoración enviada con éxito!');
      setNewRating({ puntuacion: 0, comentario: '' });
      setHasAlreadyRated(true);
      setShowCreateRatingForm(false);
      onSaved?.();
    } catch (error: any) {
      setNewRatingError(error.message || 'Error al enviar la valoración. Intenta nuevamente.');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  React.useEffect(() => {
    if (!open || !conversation) return;
    loadThread();
    loadContract();
    checkExistingRating();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, conversation?.id_conversacion]);

  // Supabase Realtime: subscribe to new messages for this conversation
  React.useEffect(() => {
    if (!open || !conversation) return;

    const channel = supabase
      .channel(`mensajes:conv:${conversation.id_conversacion}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
          filter: `id_conversacion=eq.${conversation.id_conversacion}`,
        },
        (payload) => {
          setMessages((prev) => {
            // Avoid duplicates if the message is already in the list
            if (prev.some((m) => m.id_mensaje === (payload.new as MessageRecord).id_mensaje)) {
              return prev;
            }
            return [...prev, payload.new as MessageRecord];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, conversation?.id_conversacion]);

  if (!open || !conversation) return null;

  const handleSendMessage = async () => {
    const content = messageText.trim();
    if (!content) return;
    setIsSending(true);
    setNotice({ text: '', type: null });
    try {
      const res = await fetch(`/api/jobs/conversations/${conversation.id_conversacion}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUserId,
          senderRole: currentRole,
          content,
        }),
      });

      if (res.ok) {
        setMessageText('');
        await loadThread();
        onSaved?.();
      } else {
        const errorData = await res.json().catch(() => ({}));
        setNotice({ text: errorData.message || 'No se pudo enviar el mensaje.', type: 'error' });
      }
    } finally {
      setIsSending(false);
    }
  };

  // Acción del Cliente: Aceptar Trabajo (Intención de Contratación)
  const handleAcceptJobIntent = async () => {
    setNotice({ text: '', type: null });
    try {
      const res = await fetch(`/api/jobs/conversations/${conversation.id_conversacion}/contract/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorId: currentUserId,
          actorRole: currentRole,
          action: 'INTENT'
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setCurrentContract(updated);
        
        // Enviar mensaje automático indicando la intención de contratación
        await fetch(`/api/jobs/conversations/${conversation.id_conversacion}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: currentUserId,
            senderRole: currentRole,
            content: '[INTENCIÓN DE CONTRATACIÓN] He aceptado el trabajo. Por favor, envía tu propuesta detallada con precio, fecha y materiales.'
          })
        });

        await loadThread();
        onSaved?.();
      } else {
        const err = await res.json().catch(() => ({}));
        setNotice({ text: err.message || 'Error al iniciar la intención de trabajo.', type: 'error' });
      }
    } catch {
      setNotice({ text: 'Error de red.', type: 'error' });
    }
  };

  // Acción del Cliente: No contratar (Cancela Intención de Contratación)
  const handleCancelJobIntent = async () => {
    setNotice({ text: '', type: null });
    try {
      const res = await fetch(`/api/jobs/conversations/${conversation.id_conversacion}/contract/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorId: currentUserId,
          actorRole: currentRole,
          action: 'CANCEL_INTENT',
          note: rejectReason
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setCurrentContract(updated);

        // Enviar mensaje automático
        await fetch(`/api/jobs/conversations/${conversation.id_conversacion}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: currentUserId,
            senderRole: currentRole,
            content: `[CANCELACIÓN DE INTENCIÓN] No procederé con la contratación. Motivo: ${rejectReason.trim() || 'No especificado'}`
          })
        });

        setRejectReason('');
        setShowRejectReasonInput(false);
        await loadThread();
        onSaved?.();
      } else {
        const err = await res.json().catch(() => ({}));
        setNotice({ text: err.message || 'Error al cancelar la intención.', type: 'error' });
      }
    } catch {
      setNotice({ text: 'Error de red.', type: 'error' });
    }
  };

  // Acción del Trabajador: Enviar Formulario de Propuesta
  const handleSendProposalForm = async () => {
    setProposalNotice('');
    if (!proposalData.monto || Number(proposalData.monto) <= 0) {
      setProposalNotice('Por favor ingresa un monto válido.');
      return;
    }
    if (!proposalData.fechaHora) {
      setProposalNotice('Por favor ingresa la fecha y hora.');
      return;
    }
    if (!proposalData.direccion.trim()) {
      setProposalNotice('Por favor ingresa la dirección.');
      return;
    }
    if (!proposalData.descripcion.trim()) {
      setProposalNotice('Por favor ingresa una descripción del trabajo.');
      return;
    }
    if (proposalData.materialesIncluidos && !proposalData.descripcionMateriales.trim()) {
      setProposalNotice('Por favor detalla los materiales incluidos.');
      return;
    }

    setProposalFormSending(true);
    try {
      const res = await fetch(`/api/jobs/conversations/${conversation.id_conversacion}/contract/agreement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorId: currentUserId,
          actorRole: currentRole,
          fecha_hora: proposalData.fechaHora,
          direccion: proposalData.direccion,
          descripcion: proposalData.descripcion,
          monto: Number(proposalData.monto),
          materialesIncluidos: proposalData.materialesIncluidos,
          descripcion_materiales: proposalData.materialesIncluidos ? proposalData.descripcionMateriales : null
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setCurrentContract(updated);

        const materialsText = proposalData.materialesIncluidos 
          ? `Incluye materiales: ${proposalData.descripcionMateriales}` 
          : 'No incluye materiales.';

        // Enviar mensaje estructurado al chat
        await fetch(`/api/jobs/conversations/${conversation.id_conversacion}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: currentUserId,
            senderRole: currentRole,
            content: `[PROPUESTA DE TRABAJO ENVIADA]\n• Monto: $${proposalData.monto}\n• Fecha/Hora: ${formatDateTime(proposalData.fechaHora)}\n• Dirección: ${proposalData.direccion}\n• Descripción: ${proposalData.descripcion}\n• Materiales: ${materialsText}`
          })
        });

        setProposalData({ fechaHora: '', direccion: '', descripcion: '', monto: '', materialesIncluidos: false, descripcionMateriales: '' });
        setShowProposalForm(false);
        await loadThread();
        onSaved?.();
      } else {
        const err = await res.json().catch(() => ({}));
        setProposalNotice(err.message || 'Error al enviar la propuesta.');
      }
    } catch {
      setProposalNotice('Error de red al enviar propuesta.');
    } finally {
      setProposalFormSending(false);
    }
  };

  // Acción del Cliente: Contratar (Confirmación de Propuesta)
  const handleConfirmContract = async () => {
    setNotice({ text: '', type: null });
    try {
      const res = await fetch(`/api/jobs/conversations/${conversation.id_conversacion}/contract/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorId: currentUserId,
          actorRole: currentRole,
          action: 'CONFIRM'
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setCurrentContract(updated);

        // Enviar mensaje automático
        await fetch(`/api/jobs/conversations/${conversation.id_conversacion}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: currentUserId,
            senderRole: currentRole,
            content: '[CONTRATO CONFIRMADO] ¡He aceptado la propuesta! El trabajo ha sido formalizado.'
          })
        });

        await loadThread();
        onSaved?.();
      } else {
        const err = await res.json().catch(() => ({}));
        setNotice({ text: err.message || 'Error al confirmar contratación.', type: 'error' });
      }
    } catch {
      setNotice({ text: 'Error de red.', type: 'error' });
    }
  };

  // Acción del Cliente: Cancelar Propuesta (Devolver a Renegociación)
  const handleRejectProposal = async () => {
    setNotice({ text: '', type: null });
    try {
      const res = await fetch(`/api/jobs/conversations/${conversation.id_conversacion}/contract/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorId: currentUserId,
          actorRole: currentRole,
          action: 'CANCEL_PROPOSAL'
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setCurrentContract(updated);

        // Enviar mensaje automático
        await fetch(`/api/jobs/conversations/${conversation.id_conversacion}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: currentUserId,
            senderRole: currentRole,
            content: '[PROPUESTA RECHAZADA] He rechazado la propuesta actual. Por favor, renegociemos los términos.'
          })
        });

        await loadThread();
        onSaved?.();
      } else {
        const err = await res.json().catch(() => ({}));
        setNotice({ text: err.message || 'Error al cancelar la propuesta.', type: 'error' });
      }
    } catch {
      setNotice({ text: 'Error de red.', type: 'error' });
    }
  };

  const handleCancelConfirmedContract = async () => {
    if (!window.confirm('¿Estás seguro de que deseas cancelar este contrato ya confirmado?')) return;
    setNotice({ text: '', type: null });
    try {
      const res = await fetch(`/api/jobs/conversations/${conversation.id_conversacion}/contract/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorId: currentUserId,
          actorRole: currentRole,
          action: 'CANCEL_CONFIRMED'
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setCurrentContract(updated);

        await fetch(`/api/jobs/conversations/${conversation.id_conversacion}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: currentUserId,
            senderRole: currentRole,
            content: '[CONTRATO CANCELADO] El contrato confirmado ha sido cancelado.'
          })
        });

        await loadThread();
        onSaved?.();
      } else {
        const err = await res.json().catch(() => ({}));
        setNotice({ text: err.message || 'Error al cancelar contrato.', type: 'error' });
      }
    } catch {
      setNotice({ text: 'Error de red.', type: 'error' });
    }
  };

  const handleFinalizeContract = async () => {
    if (!window.confirm('¿Estás seguro de que deseas marcar este trabajo como finalizado/concretado?')) return;
    setNotice({ text: '', type: null });
    try {
      const res = await fetch(`/api/jobs/conversations/${conversation.id_conversacion}/contract/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorId: currentUserId,
          actorRole: currentRole,
          action: 'FINALIZE'
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setCurrentContract(updated);

        // Enviar mensaje automático
        await fetch(`/api/jobs/conversations/${conversation.id_conversacion}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: currentUserId,
            senderRole: currentRole,
            content: '[TRABAJO FINALIZADO] ¡El servicio ha sido marcado como finalizado y concretado con éxito!'
          })
        });

        await loadThread();
        onSaved?.();
      } else {
        const err = await res.json().catch(() => ({}));
        setNotice({ text: err.message || 'Error al finalizar contrato.', type: 'error' });
      }
    } catch {
      setNotice({ text: 'Error de red.', type: 'error' });
    }
  };

  const isContractConfirmed = currentContract?.estado_contratacion === 'Confirmada';
  const eventDateString = currentContract?.fecha_hora || currentContract?.fecha_horario_acordado;
  
  let timeToEvent: number | null = null;
  let isCancelDisabled = false;

  if (eventDateString) {
    let str = eventDateString as string;
    // Forzamos el uso de la 'T' para formato ISO
    str = str.replace(' ', 'T');
    
    // Eliminamos cualquier offset de zona horaria (Z o +00:00) tomando solo los primeros 19 caracteres (YYYY-MM-DDTHH:mm:ss)
    // Esto asegura que el navegador interprete la fecha en la misma zona horaria local en la que el usuario la ingresó
    str = str.substring(0, 19);
    
    const contractDate = new Date(str);
    const timeRemaining = contractDate.getTime() - Date.now();
    isCancelDisabled = timeRemaining <= 3600000; // 1 hora en ms
    timeToEvent = timeRemaining;

    console.log('[DEBUG CANCELAR CONTRATO]', {
      rawDate: eventDateString,
      parsedContractDate: contractDate.toLocaleString(),
      now: new Date().toLocaleString(),
      diffMinutes: Math.floor(timeRemaining / 60000),
      isCancelDisabled
    });
  }

  const canCancel = isContractConfirmed && timeToEvent !== null && !isCancelDisabled;

  const isTimeEligible = React.useMemo(() => {
    // Solo habilitar la calificación si ya pasó más de 1 hora desde el inicio del trabajo.
    // Como timeToEvent = contractDate - Date.now(), si ya pasó 1 hora, el resultado es <= -3600000.
    return timeToEvent !== null && timeToEvent <= -3600000;
  }, [timeToEvent]);

  // Mutual interaction rule: both client and worker must have sent at least one message
  const bothParticipated = React.useMemo(() => {
    const clientSent = messages.some((m) => m.id_emisor_cliente != null);
    const workerSent = messages.some((m) => m.id_emisor_trabajador != null);
    return clientSent && workerSent;
  }, [messages]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-4xl">
        <Card className="overflow-hidden bg-white shadow-2xl max-h-[90vh] overflow-y-auto p-0 relative">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6 md:p-8">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
                <MessageSquare className="w-4 h-4" /> Mensajería interna
              </div>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{counterpartName}</h3>
              <p className="text-sm text-slate-500 mt-1">Última actividad {formatDateTime(conversation.ultima_actividad)}</p>
            </div>
            <div className="flex items-center gap-2">
              {isClient && (
                <Button variant="outline" className="shrink-0" onClick={loadWorkerContact} disabled={workerContactLoading}>
                  {workerContactLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Phone className="w-4 h-4 mr-2" />}
                  Contactar
                </Button>
              )}
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all cursor-pointer" title="Cerrar modal">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Contact Info Section */}
          {showContactInfo && workerContactInfo && (
            <div className="mx-6 mt-6 p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Información de contacto</p>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Phone className="w-4 h-4 text-primary" />
                <span>{workerContactInfo.phone || 'No informado'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Mail className="w-4 h-4 text-primary" />
                <span>{workerContactInfo.email || 'No informado'}</span>
              </div>
            </div>
          )}

          {/* Panel de Contrato / Negociación */}
          <div className="bg-slate-50 border-b border-slate-200 p-6 md:px-8 space-y-4">
            {(currentContract?.estado_contratacion === 'Pendiente' || currentContract?.estado_contratacion === 'Cancelada') && (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm animate-fade-in">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {currentContract?.estado_contratacion === 'Cancelada' ? 'Estado: Contrato Cancelado' : 'Estado: Chat Activo'}
                  </span>
                  <p className="text-sm text-slate-600 mt-1">
                    {currentContract?.estado_contratacion === 'Cancelada' ? (
                      isClient
                        ? 'El contrato anterior fue cancelado. Puedes volver a contratar para solicitar una propuesta formal.'
                        : 'El contrato anterior fue cancelado. Esperando que el cliente inicie una intención de contratación.'
                    ) : (
                      isClient
                        ? 'Puedes iniciar una intención de contratación para solicitar una propuesta formal.'
                        : 'Esperando que el cliente inicie una intención de contratación.'
                    )}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {isClient ? (
                    <>
                      <Button
                        variant="primary"
                        className="bg-emerald-600 hover:bg-emerald-700 text-xs py-2 px-4 font-bold flex items-center gap-1.5 disabled:opacity-40"
                        onClick={handleAcceptJobIntent}
                        disabled={!bothParticipated}
                      >
                        <CheckCircle2 className="w-4 h-4" /> {currentContract?.estado_contratacion === 'Cancelada' ? 'Volver a contratar' : 'Aceptar trabajo'}
                      </Button>
                      {!bothParticipated && (
                        <p className="text-[10px] text-slate-400 font-semibold self-center max-w-[140px] leading-tight">
                          Ambas partes deben haber escrito al menos un mensaje.
                        </p>
                      )}
                    </>
                  ) : (
                    <Button variant="outline" className="text-xs py-2 px-4 font-bold border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed" disabled>
                      Aceptar pedido
                    </Button>
                  )}
                </div>
              </div>
            )}

            {currentContract?.estado_contratacion === 'IntencionCliente' && (
              <div className="flex flex-col gap-4 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 shadow-sm animate-fade-in">
                {showRejectReasonInput ? (
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase">Motivo del rechazo de la contratación (Opcional):</label>
                    <textarea
                      className="input-soft w-full min-h-20 bg-white"
                      placeholder="Ej: Conseguí otro profesional, presupuesto fuera del rango..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" className="text-xs py-2" onClick={() => setShowRejectReasonInput(false)}>Volver</Button>
                      <Button variant="primary" className="bg-red-600 hover:bg-red-700 text-white text-xs py-2" onClick={handleCancelJobIntent}>
                        Confirmar no contratar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Estado: Intención de Contratación</span>
                      <p className="text-sm text-slate-700 mt-1">
                        {isClient
                          ? 'Has enviado una solicitud de contratación. Esperando propuesta del trabajador.'
                          : 'El cliente solicita tus servicios. Acepta el pedido para detallar tu propuesta de trabajo.'}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {isClient ? (
                        <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 text-xs py-2 px-4 font-bold" onClick={() => setShowRejectReasonInput(true)}>
                          No contratar
                        </Button>
                      ) : (
                        <Button variant="primary" className="bg-indigo-600 hover:bg-indigo-700 text-xs py-2 px-4 font-bold flex items-center gap-1.5" onClick={() => setShowProposalForm(true)}>
                          <Briefcase className="w-4 h-4" /> Aceptar pedido
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentContract?.estado_contratacion === 'PropuestaEnviada' && (
              <div className="p-6 rounded-2xl bg-amber-50/50 border border-amber-200 shadow-sm space-y-4 animate-fade-in">
                <div className="flex items-center justify-between border-b border-amber-200/50 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Propuesta de Trabajo</span>
                  <div className="text-lg font-black text-amber-900">${currentContract.monto}</div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider block">Fecha y Hora</span>
                    <span className="text-slate-800 font-medium">{formatDateTime(currentContract.fecha_hora)}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider block">Dirección</span>
                    <span className="text-slate-800 font-medium">{currentContract.direccion}</span>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider block">Descripción del Trabajo</span>
                    <p className="text-slate-800 bg-white/60 p-2.5 rounded-xl border border-slate-100 italic leading-relaxed">"{currentContract.descripcion}"</p>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider block">Materiales Incluidos</span>
                    <span className="text-slate-800 font-medium block">
                      {currentContract.materiales_incluidos ? (
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-[10px] font-bold">Sí</span>
                      ) : (
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">No</span>
                      )}
                    </span>
                    {currentContract.materiales_incluidos && currentContract.descripcion_materiales && (
                      <p className="text-slate-700 bg-white/60 p-2.5 rounded-xl border border-slate-100 mt-1 italic">
                        Detalles: {currentContract.descripcion_materiales}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-amber-200/50 pt-3">
                  {isClient ? (
                    <>
                      <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 text-xs py-2 px-4 font-bold" onClick={handleRejectProposal}>
                        Cancelar
                      </Button>
                      <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-700 text-xs py-2 px-4 font-bold flex items-center gap-1.5" onClick={handleConfirmContract}>
                        <CheckCircle2 className="w-4 h-4" /> Contratar
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-amber-800 font-semibold italic">Esperando decisión del cliente sobre la propuesta.</span>
                  )}
                </div>
              </div>
            )}

            {currentContract?.estado_contratacion === 'Confirmada' && (
              <div className="space-y-4 w-full">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-full">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-emerald-800">✓ Contrato Confirmado</h5>
                      <p className="text-xs text-emerald-600">El trabajo ha sido formalizado. Los datos de contacto del profesional están disponibles.</p>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-3">
                    <Button 
                      variant="primary" 
                      className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs py-2 px-4 font-bold" 
                      onClick={handleFinalizeContract}
                    >
                      Finalizar Trabajo
                    </Button>
                    <div className="flex flex-col items-end">
                      <Button 
                        variant="outline" 
                        className="border-red-200 text-red-600 hover:bg-red-50 text-xs py-2 px-4 font-bold" 
                        onClick={handleCancelConfirmedContract}
                        disabled={!canCancel}
                      >
                        Cancelar contrato
                      </Button>
                      {!canCancel && timeToEvent !== null && timeToEvent > 0 && (
                        <span className="text-[10px] text-red-500 font-bold mt-1 max-w-[150px] text-right leading-tight">
                          No es posible cancelar con menos de 1 hora de anticipación.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isClient && isTimeEligible && !hasAlreadyRated && (
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-4 animate-fade-in">
                    {!showCreateRatingForm ? (
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h6 className="font-bold text-sm text-primary">¿Cómo fue tu experiencia?</h6>
                          <p className="text-xs text-slate-500">Ya puedes calificar a este trabajador por el servicio realizado.</p>
                        </div>
                        <Button variant="primary" className="text-xs font-bold py-2 px-4 shrink-0" onClick={() => setShowCreateRatingForm(true)}>
                          Calificar trabajador
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h6 className="font-bold text-sm text-primary">Calificar a {counterpartName}</h6>
                          <button onClick={() => setShowCreateRatingForm(false)} className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer">
                            Cancelar
                          </button>
                        </div>
                        
                        {newRatingError && (
                          <div className="bg-red-100 text-red-700 p-3 rounded-xl text-xs font-bold">
                            {newRatingError}
                          </div>
                        )}
                        {newRatingSuccess && (
                          <div className="bg-green-100 text-green-700 p-3 rounded-xl text-xs font-bold">
                            {newRatingSuccess}
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-700">Tu puntuación:</label>
                          <RatingStars
                            rating={newRating.puntuacion}
                            onRatingChange={(r) => setNewRating({ ...newRating, puntuacion: r })}
                            editable
                            size={5}
                          />
                          {newRating.puntuacion === 0 && newRatingError.includes('puntuación') && (
                            <p className="text-[10px] text-red-600 font-semibold mt-1">La puntuación es obligatoria.</p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">Comentario (opcional):</label>
                          <textarea
                            className="input-soft min-h-20 resize-none bg-white"
                            placeholder="Comparte tu experiencia..."
                            maxLength={500}
                            value={newRating.comentario}
                            onChange={(e) => setNewRating({ ...newRating, comentario: e.target.value })}
                          />
                          <p className="text-[10px] text-slate-500 text-right">
                            {newRating.comentario.length}/500
                          </p>
                        </div>

                        <div className="flex justify-end">
                          <Button
                            onClick={handleCreateWorkerRating}
                            disabled={isSubmittingRating || newRating.puntuacion === 0}
                            className="text-xs py-2 px-4"
                          >
                            {isSubmittingRating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar valoración'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isClient && hasAlreadyRated && (
                  <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold text-center">
                    ✓ Ya has calificado a este trabajador por este servicio.
                  </div>
                )}
              </div>
            )}

            {currentContract?.estado_contratacion === 'Rechazada' && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 shadow-sm flex items-center gap-3 animate-fade-in">
                <div className="p-2 bg-red-100 text-red-700 rounded-full">
                  <X className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-bold text-sm text-red-800">✕ Contrato Rechazado</h5>
                  <p className="text-xs text-red-600">Este contrato ha sido rechazado de manera definitiva.</p>
                </div>
              </div>
            )}

            {currentContract?.estado_contratacion === 'Finalizada' && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm flex items-center gap-3 animate-fade-in">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-full">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-bold text-sm text-emerald-800">✓ Trabajo Finalizado</h5>
                  <p className="text-xs text-emerald-600">Este servicio ha sido concretado y marcado como finalizado con éxito.</p>
                </div>
              </div>
            )}
          </div>

          {notice.text && (
            <div className={`mx-6 mt-6 rounded-2xl p-4 text-sm font-bold ${notice.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {notice.text}
            </div>
          )}

          {/* Chat Panel */}
          <div className="p-6 md:p-8 space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-slate-900">Chat</h4>
              <Button variant="ghost" onClick={loadThread} className="text-xs">
                <RefreshCw className="w-4 h-4 mr-2" /> Actualizar
              </Button>
            </div>

            <div className="space-y-3 max-h-[42vh] overflow-y-auto pr-2">
              {isLoading ? (
                <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
              ) : messages.length > 0 ? (
                messages.map((message) => {
                  const isMine = (currentRole === 'CLIENT' && Boolean(message.id_emisor_cliente)) || (currentRole === 'WORKER' && Boolean(message.id_emisor_trabajador));
                  return (
                    <div key={message.id_mensaje} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-3xl px-4 py-3 text-sm shadow-sm ${isMine ? 'bg-primary text-white' : 'bg-slate-100 text-slate-800'}`}>
                        <p className="whitespace-pre-wrap leading-relaxed">{message.contenido_mensaje}</p>
                        <div className={`mt-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${isMine ? 'text-white/70' : 'text-slate-400'}`}>
                          <Clock3 className="w-3 h-3" /> {formatDateTime(message.fecha_mensaje)}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-20 text-center text-slate-400">Aún no hay mensajes en esta conversación.</div>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <textarea
                className="input-soft min-h-28 resize-none"
                placeholder="Escribe un mensaje interno..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                disabled={currentContract?.estado_contratacion === 'Rechazada'}
              />
              <div className="flex justify-end gap-2">
                <Button onClick={handleSendMessage} disabled={isSending || !messageText.trim() || currentContract?.estado_contratacion === 'Rechazada'}>
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : <><Send className="w-4 h-4 mr-2" /> Enviar mensaje</>}
                </Button>
              </div>
            </div>
          </div>

          {/* Modal de Propuesta del Trabajador */}
          {showProposalForm && (
            <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg">
                <Card className="p-6 bg-white shadow-2xl space-y-6">
                  <div className="flex justify-between items-center border-b pb-3">
                    <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                      <Briefcase className="w-5 h-5" /> Propuesta de Trabajo
                    </h3>
                    <button onClick={() => setShowProposalForm(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 cursor-pointer">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Header de Lectura */}
                  <div className="bg-slate-50 p-4 rounded-2xl space-y-2 border border-slate-100">
                    <div className="flex justify-between text-xs text-slate-500">
                      <div>
                        <span className="font-bold uppercase block text-[9px] text-slate-400">Cliente</span>
                        <span className="font-bold text-slate-800 text-sm">{counterpartName}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold uppercase block text-[9px] text-slate-400">Trabajador</span>
                        <span className="font-bold text-slate-800 text-sm">{userName}</span>
                      </div>
                    </div>
                  </div>

                  {proposalNotice && (
                    <div className="p-3 bg-red-100 text-red-700 rounded-xl text-xs font-bold">{proposalNotice}</div>
                  )}

                  {/* Form Fields */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Fecha y Hora</label>
                        <input
                          type="datetime-local"
                          className="input-soft"
                          value={proposalData.fechaHora}
                          onChange={(e) => setProposalData({ ...proposalData, fechaHora: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Monto ($)</label>
                        <input
                          type="number"
                          placeholder="Monto final"
                          className="input-soft"
                          value={proposalData.monto}
                          onChange={(e) => setProposalData({ ...proposalData, monto: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Dirección / Zona del Trabajo</label>
                      <input
                        type="text"
                        placeholder="Dirección exacta"
                        className="input-soft"
                        value={proposalData.direccion}
                        onChange={(e) => setProposalData({ ...proposalData, direccion: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Descripción detallada</label>
                      <textarea
                        placeholder="Describe el trabajo a realizar..."
                        className="input-soft min-h-20 resize-none"
                        value={proposalData.descripcion}
                        onChange={(e) => setProposalData({ ...proposalData, descripcion: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2 border-t pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600">¿Incluye Materiales?</span>
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-primary accent-primary cursor-pointer"
                          checked={proposalData.materialesIncluidos}
                          onChange={(e) => setProposalData({ ...proposalData, materialesIncluidos: e.target.checked })}
                        />
                      </div>

                      {proposalData.materialesIncluidos && (
                        <div className="space-y-1 mt-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Detalle de Materiales</label>
                          <textarea
                            placeholder="Detalla los materiales incluidos (ej: Cables, caños, etc.)..."
                            className="input-soft min-h-16 resize-none"
                            value={proposalData.descripcionMateriales}
                            onChange={(e) => setProposalData({ ...proposalData, descripcionMateriales: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button variant="ghost" className="flex-1 text-xs py-2.5" onClick={() => setShowProposalForm(false)}>
                      Cancelar
                    </Button>
                    <Button
                      variant="primary"
                      className="flex-1 text-xs py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                      onClick={handleSendProposalForm}
                      disabled={proposalFormSending}
                    >
                      {proposalFormSending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Enviar propuesta'}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

// --- Views ---

const LandingPage = ({ onStart }: { onStart: (role: UserRole | null, isLogin: boolean) => void }) => (
  <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-base/10">
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl w-full text-center space-y-8"
    >
      <div className="flex justify-center mb-8">
        <div className="p-8 bg-white rounded-[4rem] shadow-xl">
           <img src="/images/logo1.png" alt="Hero Logo" className="w-64 h-auto" onError={(e) => {
             e.currentTarget.src = "/images/logo2.png";
           }} />
        </div>
      </div>
      
      <h1 className="text-6xl font-extrabold text-primary tracking-tight leading-tight">
        Conectamos trabajadores <span className="text-accent underline decoration-4 underline-offset-8">de oficio </span>con tus necesidades.
      </h1>
      <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
        Busca trabajadores que te brinden la solucion a tu problema, o encuentra oportunidades laborales que se ajusten a tu experiencia y reputacion. Sin vueltas, con transparencia y resultados efectivos.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
        <Button onClick={() => onStart(null, false)} className="text-lg px-12 py-5 shadow-lg shadow-primary/20">
          Comenzar ahora
        </Button>
        <Button 
          variant="outline" 
          className="text-lg px-12 py-5"
          onClick={() => onStart(null, true)}
        >
          Ya tengo cuenta (Ingresar)
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
        {[
          { icon: <ShieldCheck className="w-8 h-8"/>, title: "Validación DNI", desc: "Seguridad total con validación de documentos obligatoria." },
          { icon: <Star className="w-8 h-8"/>, title: "Sistema de Scoring", desc: "Contrata basado en reputación real y verificada." },
          { icon: <CheckCircle2 className="w-8 h-8"/>, title: "Certificados", desc: "Trabajadores con antecedentes de buena conducta." }
        ].map((feat, i) => (
          <Card key={i} className="flex flex-col items-center text-center space-y-3 border-none bg-white/60 backdrop-blur-sm">
            <div className="p-4 bg-primary/5 rounded-3xl text-primary">{feat.icon}</div>
            <h3 className="font-bold text-lg">{feat.title}</h3>
            <p className="text-sm text-gray-500">{feat.desc}</p>
          </Card>
        ))}
      </div>
    </motion.div>
  </div>
);

const AuthForm = ({ initialIsLogin, onAuth, onBackToLanding }: { initialIsLogin: boolean; onAuth: (user: any) => void; onBackToLanding: () => void }) => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [step, setStep] = useState(1);
  const [isLogin, setIsLogin] = useState(initialIsLogin);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error' | null}>({text: '', type: null});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [trades, setTrades] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', dni: '', phone: '', age: '', tradeId: '',
    files: { dniFront: null as File | null, dniBack: null as File | null, policeCert: null as File | null }
  });

  React.useEffect(() => {
    async function loadTrades() {
      const res = await fetch('/api/jobs/trades');
      if (res.ok) setTrades(await res.json());
    }
    loadTrades();
  }, []);

  React.useEffect(() => {
    if (!message.text) return;
    setMessage({ text: '', type: null });
  }, [formData, role, step, isLogin]);

  const fieldToStep: Record<string, number> = {
    email: 1,
    password: 1,
    name: 2,
    dni: 2,
    phone: 2,
    age: 2,
    dniFront: 3,
    dniBack: 3,
    policeCert: 3,
    tradeId: 3,
  };

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const setFormField = (field: 'name' | 'email' | 'password' | 'dni' | 'phone' | 'age' | 'tradeId', value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
  };

  const setFileField = (field: 'dniFront' | 'dniBack' | 'policeCert', value: File | null) => {
    setFormData((prev) => ({ ...prev, files: { ...prev.files, [field]: value } }));
    clearFieldError(field);
  };

  const jumpToFirstInvalidStep = (errors: Record<string, string>) => {
    if (isLogin) return;
    const steps = Object.keys(errors)
      .map((field) => fieldToStep[field])
      .filter((value): value is number => Boolean(value));
    if (!steps.length) return;
    const targetStep = Math.min(...steps);
    if (targetStep !== step) setStep(targetStep);
  };

  const validateCurrentStep = () => {
    const errors: Record<string, string> = {};

    if (isLogin || step === 1) {
      if (!formData.email.trim()) {
        errors.email = 'El correo es obligatorio.';
      } else if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
        errors.email = 'Ingresa un correo electronico valido.';
      }

      if (!formData.password.trim()) {
        errors.password = 'La contrasena es obligatoria.';
      } else if (!isLogin && formData.password.trim().length < 8) {
        errors.password = 'La contrasena debe tener al menos 8 caracteres.';
      }

      return errors;
    }

    if (step === 2) {
      if (!formData.name.trim()) errors.name = 'El nombre completo es obligatorio.';

      if (!formData.dni.trim()) {
        errors.dni = 'El DNI es obligatorio.';
      } else {
        const dniNumber = Number(formData.dni);
        if (Number.isNaN(dniNumber)) {
          errors.dni = 'El DNI debe ser numerico.';
        } else if (dniNumber < 1000000) {
          errors.dni = 'El DNI debe ser mayor o igual a 1000000.';
        }
      }

      if (!formData.phone.trim()) errors.phone = 'El celular es obligatorio.';

      if (!formData.age.trim()) {
        errors.age = 'La edad es obligatoria.';
      } else {
        const ageNumber = Number(formData.age);
        if (Number.isNaN(ageNumber)) {
          errors.age = 'La edad debe ser numerica.';
        } else if (ageNumber < 18) {
          errors.age = 'La edad debe ser mayor o igual a 18 anios.';
        }
      }

      return errors;
    }

    if (step === 3) {
      if (!formData.files.dniFront) errors.dniFront = 'Debes subir el DNI frente.';
      if (!formData.files.dniBack) errors.dniBack = 'Debes subir el DNI dorso.';

      if (role === UserRole.WORKER) {
        if (!formData.files.policeCert) {
          errors.policeCert = 'Debes subir antecedentes penales.';
        }
        if (!formData.tradeId) errors.tradeId = 'Selecciona al menos un oficio.';
      }
    }

    return errors;
  };

  const mapBackendField = (rawField: string) => {
    const normalized = rawField.toLowerCase();
    if (normalized.includes('correo') || normalized.includes('email')) return 'email';
    if (normalized.includes('contrase') || normalized.includes('password')) return 'password';
    if (normalized.includes('nombre')) return 'name';
    if (normalized.includes('dni') && normalized.includes('frente')) return 'dniFront';
    if (normalized.includes('dni') && (normalized.includes('dorso') || normalized.includes('reverso'))) return 'dniBack';
    if (normalized.includes('dni')) return 'dni';
    if (normalized.includes('celular') || normalized.includes('telefono')) return 'phone';
    if (normalized.includes('edad')) return 'age';
    if (normalized.includes('oficio')) return 'tradeId';
    if (normalized.includes('certificado') || normalized.includes('conducta') || normalized.includes('antecedentes')) return 'policeCert';
    return null;
  };

  const mapMessageToField = (rawMessage: string) => mapBackendField(rawMessage);

  const parseBackendValidation = (payload: any) => {
    const nextFieldErrors: Record<string, string> = {};
    let normalizedMessage = 'No se pudo completar la operacion.';

    const rawMessage = payload?.message;
    const rawErrors = payload?.errors;

    if (typeof rawMessage === 'string' && rawMessage.trim()) {
      normalizedMessage = rawMessage;
    } else if (Array.isArray(rawMessage) && rawMessage.length) {
      normalizedMessage = rawMessage.join(' ');
    }

    if (Array.isArray(rawErrors)) {
      rawErrors.forEach((errorItem: any) => {
        const field = mapBackendField(String(errorItem?.field || '')) || mapMessageToField(String(errorItem?.message || ''));
        if (field && !nextFieldErrors[field] && typeof errorItem?.message === 'string') {
          nextFieldErrors[field] = errorItem.message;
        }
      });
    }

    const rawMessagesList = Array.isArray(rawMessage)
      ? rawMessage
      : typeof rawMessage === 'string'
        ? rawMessage.split(',')
        : [];

    rawMessagesList
      .map((item) => String(item).trim())
      .filter(Boolean)
      .forEach((item) => {
        const field = mapMessageToField(item);
        if (field && !nextFieldErrors[field]) nextFieldErrors[field] = item;
      });

    return { fieldErrors: nextFieldErrors, message: normalizedMessage };
  };

  const normalizeAuthUser = (payload: any) => {
    const rawUser = payload?.user?.user ?? payload?.user;
    return {
      ...rawUser,
      role,
      name: rawUser?.nombre_y_apellido_cliente || rawUser?.nombre_y_apellido_trabajador,
    };
  };

  const handleBack = () => {
    setFieldErrors({});
    if (!role) {
      onBackToLanding();
    } else if (isLogin || step === 1) {
      setRole(null);
      setIsLogin(initialIsLogin);
    } else {
      setStep(step - 1);
    }
  };

  const handleAuthOperation = async () => {
    setMessage({text: '', type: null});
    setFieldErrors({});
    setIsLoading(true);

    try {
      if (isLogin) {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            correo: formData.email,
            contraseña: formData.password,
            rol: role === UserRole.CLIENT ? 'CLIENT' : 'WORKER'
          })
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw payload;
        }
        const result = await response.json();
        setFieldErrors({});
        setMessage({text: '¡Ingreso exitoso!', type: 'success'});
        setTimeout(() => onAuth(normalizeAuthUser(result)), 1000);
      } else {
        // Registration
        const endpoint = role === UserRole.CLIENT ? '/api/auth/register/client' : '/api/auth/register/worker';
        const payload = role === UserRole.CLIENT ? {
          correo_cliente: formData.email,
          contraseña_cliente: formData.password,
          nombre_y_apellido_cliente: formData.name,
          dni_cliente: Number(formData.dni),
          edad_cliente: Number(formData.age),
          celular_cliente: formData.phone,
          url_dni_frente: 'https://placeholder.com/f',
          url_dni_dorso: 'https://placeholder.com/d'
        } : {
          correo_trabajador: formData.email,
          contraseña_trabajador: formData.password,
          nombre_y_apellido_trabajador: formData.name,
          dni_trabajador: Number(formData.dni),
          edad_trabajador: Number(formData.age),
          nro_celular_trabajador: formData.phone,
          url_dni_frente_trabajador: 'https://placeholder.com/f',
          url_dni_reverso_trabajador: 'https://placeholder.com/r',
          url_certificado_buena_conducta: 'https://placeholder.com/c',
          monotributo_trabajador: true,
          id_oficios: [Number(formData.tradeId)]
        };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw payload;
        }
        const result = await response.json();
        setFieldErrors({});
        setMessage({text: '¡Registro completado!', type: 'success'});
        setTimeout(() => onAuth(normalizeAuthUser(result)), 1000);
      }
    } catch (error: any) {
      const { fieldErrors: backendFieldErrors, message: backendMessage } = parseBackendValidation(error);
      if (Object.keys(backendFieldErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...backendFieldErrors }));
        jumpToFirstInvalidStep(backendFieldErrors);
      }
      setMessage({text: backendMessage || 'No se pudo completar la operacion.', type: 'error'});
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitOrNext = async () => {
    const currentErrors = validateCurrentStep();
    if (Object.keys(currentErrors).length > 0) {
      setFieldErrors(currentErrors);
      jumpToFirstInvalidStep(currentErrors);
      setMessage({ text: 'Revisa los campos marcados para continuar.', type: 'error' });
      return;
    }

    setFieldErrors({});
    if (isLogin || step === 3) {
      await handleAuthOperation();
      return;
    }
    setStep(step + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-10 space-y-8 bg-white relative overflow-hidden">
        {!isLogin && role && (
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-100">
             <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: `${(step / 3) * 100}%` }} />
          </div>
        )}

        <div className="absolute top-6 left-6">
          <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-primary flex items-center gap-1 text-xs font-bold">
            <ChevronLeft className="w-4 h-4"/>
            {role ? 'Atrás' : 'Inicio'}
          </button>
        </div>

        {message.text && (
          <div className={`p-4 rounded-2xl text-sm font-bold text-center ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message.text}
          </div>
        )}

        {!role ? (
          <div className="space-y-6 pt-4 text-center">
            <h2 className="text-3xl font-bold text-primary">Bienvenido a YacaJobs</h2>
            <div className="grid grid-cols-1 gap-4">
              <button onClick={() => { setRole(UserRole.CLIENT); setFieldErrors({}); setMessage({ text: '', type: null }); }} className="group p-6 bg-white border border-black/5 rounded-[32px] hover:border-accent transition-all text-left flex items-center justify-between shadow-sm">
                <div><h3 className="font-bold text-xl text-primary">Soy Cliente</h3><p className="text-sm text-muted">A contratar servicios.</p></div>
                <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-accent group-hover:translate-x-1 transition-all"/>
              </button>
              <button onClick={() => { setRole(UserRole.WORKER); setFieldErrors({}); setMessage({ text: '', type: null }); }} className="group p-6 bg-white border border-black/5 rounded-[32px] hover:border-accent transition-all text-left flex items-center justify-between shadow-sm">
                <div><h3 className="font-bold text-xl text-primary">Soy Trabajador</h3><p className="text-sm text-muted">A ofrecer mis servicios.</p></div>
                <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-accent group-hover:translate-x-1 transition-all"/>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            <h2 className="text-2xl font-bold text-primary">{isLogin ? 'Ingresar' : `Registro ${role === UserRole.CLIENT ? 'Cliente' : 'Trabajador'}`}</h2>
            
            <AnimatePresence mode="wait">
              {(step === 1 || isLogin) && (
                <motion.div key="s1" className="space-y-4">
                   <div>
                     <input className={`input-soft ${fieldErrors.email ? 'border-red-400 focus:border-red-500' : ''}`} placeholder="Correo" type="email" value={formData.email} onChange={e => setFormField('email', e.target.value)} />
                     {fieldErrors.email && <p className="text-xs text-red-600 font-semibold mt-1">{fieldErrors.email}</p>}
                   </div>
                   <div>
                     <input className={`input-soft ${fieldErrors.password ? 'border-red-400 focus:border-red-500' : ''}`} placeholder="Contraseña" type="password" value={formData.password} onChange={e => setFormField('password', e.target.value)} />
                     {fieldErrors.password && <p className="text-xs text-red-600 font-semibold mt-1">{fieldErrors.password}</p>}
                   </div>
                </motion.div>
              )}
              {step === 2 && !isLogin && (
                <motion.div key="s2" className="space-y-4">
                   <div>
                     <input className={`input-soft ${fieldErrors.name ? 'border-red-400 focus:border-red-500' : ''}`} placeholder="Nombre completo" value={formData.name} onChange={e => setFormField('name', e.target.value)} />
                     {fieldErrors.name && <p className="text-xs text-red-600 font-semibold mt-1">{fieldErrors.name}</p>}
                   </div>
                   <div>
                     <input className={`input-soft ${fieldErrors.dni ? 'border-red-400 focus:border-red-500' : ''}`} placeholder="DNI" value={formData.dni} onChange={e => setFormField('dni', e.target.value)} />
                     {fieldErrors.dni && <p className="text-xs text-red-600 font-semibold mt-1">{fieldErrors.dni}</p>}
                   </div>
                   <div className="flex gap-4">
                     <div className="flex-1">
                       <input className={`input-soft ${fieldErrors.age ? 'border-red-400 focus:border-red-500' : ''}`} placeholder="Edad" type="number" value={formData.age} onChange={e => setFormField('age', e.target.value)} />
                       {fieldErrors.age && <p className="text-xs text-red-600 font-semibold mt-1">{fieldErrors.age}</p>}
                     </div>
                     <div className="flex-1">
                       <input className={`input-soft ${fieldErrors.phone ? 'border-red-400 focus:border-red-500' : ''}`} placeholder="Celular" value={formData.phone} onChange={e => setFormField('phone', e.target.value)} />
                       {fieldErrors.phone && <p className="text-xs text-red-600 font-semibold mt-1">{fieldErrors.phone}</p>}
                     </div>
                   </div>
                </motion.div>
              )}
              {step === 3 && !isLogin && (
                <motion.div key="s3" className="space-y-4">
                   <div className="space-y-2">
                     <p className="text-xs font-bold text-gray-400 uppercase">Documentación Obligatoria</p>
                     <div className="grid grid-cols-2 gap-4">
                       <button onClick={() => setFileField('dniFront', {} as File)} className={`p-4 border-2 rounded-2xl text-xs font-bold ${fieldErrors.dniFront ? 'border-red-400 text-red-600' : (formData.files.dniFront ? 'border-primary text-primary' : 'border-dashed text-gray-400')}`}>DNI Frente</button>
                       <button onClick={() => setFileField('dniBack', {} as File)} className={`p-4 border-2 rounded-2xl text-xs font-bold ${fieldErrors.dniBack ? 'border-red-400 text-red-600' : (formData.files.dniBack ? 'border-primary text-primary' : 'border-dashed text-gray-400')}`}>DNI Dorso</button>
                     </div>
                     {fieldErrors.dniFront && <p className="text-xs text-red-600 font-semibold mt-1">{fieldErrors.dniFront}</p>}
                     {fieldErrors.dniBack && <p className="text-xs text-red-600 font-semibold mt-1">{fieldErrors.dniBack}</p>}
                     {role === UserRole.WORKER && (
                       <>
                         <button onClick={() => setFileField('policeCert', {} as File)} className={`w-full p-4 border-2 rounded-2xl text-xs font-bold ${fieldErrors.policeCert ? 'border-red-400 text-red-600' : (formData.files.policeCert ? 'border-primary text-primary' : 'border-dashed text-gray-400')}`}>Antecedentes Penales</button>
                         {fieldErrors.policeCert && <p className="text-xs text-red-600 font-semibold mt-1">{fieldErrors.policeCert}</p>}
                         <select className={`input-soft ${fieldErrors.tradeId ? 'border-red-400 focus:border-red-500' : ''}`} value={formData.tradeId} onChange={e => setFormField('tradeId', e.target.value)}>
                           <option value="">Selecciona tu Oficio</option>
                           {trades.map(t => <option key={t.id_oficio} value={t.id_oficio}>{t.nombre_oficio}</option>)}
                         </select>
                         {fieldErrors.tradeId && <p className="text-xs text-red-600 font-semibold mt-1">{fieldErrors.tradeId}</p>}
                       </>
                     )}
                   </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button onClick={handleSubmitOrNext} disabled={isLoading} className="w-full py-4 text-lg flex justify-center items-center gap-2">
              {isLoading && <Loader2 className="w-5 h-5 animate-spin"/>}
              {isLogin ? 'Ingresar' : (step === 3 ? 'Finalizar' : 'Siguiente')}
            </Button>
            <button onClick={() => { setIsLogin(!isLogin); setStep(1); setFieldErrors({}); setMessage({ text: '', type: null }); }} className="w-full text-sm font-bold text-primary hover:underline">
              {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Ingresa'}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};

const ClientDashboard = ({ user, onLogout }: { user: any; onLogout: () => void }) => {
  const [activeTab, setActiveTab] = useState<'search' | 'posts' | 'profile' | 'messages' | 'history'>('search');
  const { notifications, unreadCount, markAsRead, markAllAsRead, markSectionAsRead } = useNotifications(user?.id_cliente, UserRole.CLIENT);
  const unreadPosts = notifications.filter(n => !n.leido && n.seccion_destino === 'PEDIDOS').length;
  const unreadMessages = notifications.filter(n => !n.leido && n.seccion_destino === 'MENSAJERIA').length;

  React.useEffect(() => {
    if (activeTab === 'posts') markSectionAsRead('PEDIDOS');
    else if (activeTab === 'messages') markSectionAsRead('MENSAJERIA');
  }, [activeTab, notifications]);
  const [trades, setTrades] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [newPost, setNewPost] = useState({ tradeId: '', description: '', urgency: '' });
  const [postErrors, setPostErrors] = useState<{ tradeId?: string; urgency?: string; description?: string }>({});
  const [postNotice, setPostNotice] = useState<{ text: string; type: 'success' | 'error' | null }>({ text: '', type: null });
  const [profileData, setProfileData] = useState({ ...user });
  const [isSaving, setIsSaving] = useState(false);
  const [profileNotice, setProfileNotice] = useState<{ text: string; type: 'success' | 'error' | null }>({ text: '', type: null });
  const [viewingPostulations, setViewingPostulations] = useState<any>(null);
  const [postulations, setPostulations] = useState<any[]>([]);
  const [postulationsSort, setPostulationsSort] = useState<'price_asc' | 'rating_desc'>('price_asc');
  const [isLoadingPostulations, setIsLoadingPostulations] = useState(false);
  const [selectedWorkerProfile, setSelectedWorkerProfile] = useState<any>(null);
  const [isLoadingWorkerProfile, setIsLoadingWorkerProfile] = useState(false);
  const [workerProfileError, setWorkerProfileError] = useState('');
  const [workerRatings, setWorkerRatings] = useState<Rating[]>([]);
  const [isLoadingWorkerRatings, setIsLoadingWorkerRatings] = useState(false);

  const loadInitial = async () => {
    const clientId = Number(user?.id_cliente);
    const tRes = await fetch('/api/jobs/trades');
    if (tRes.ok) setTrades(await tRes.json());

    if (!Number.isFinite(clientId)) {
      setPosts([]);
      return;
    }

    const pRes = await fetch(`/api/jobs/posts?clientId=${clientId}`);
    if (pRes.ok) setPosts(await pRes.json());
  };

  React.useEffect(() => { loadInitial(); }, []);

  const maxPostDescriptionLength = 500;

  const clearPostError = (field: 'tradeId' | 'urgency' | 'description') => {
    setPostErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      setPostNotice({ text: '', type: null });
      return next;
    });
  };

  const validateNewPost = () => {
    const errors: Record<string, string> = {};
    if (!newPost.tradeId) errors.tradeId = 'Selecciona un oficio válido.';
    if (!newPost.urgency) errors.urgency = 'Selecciona una prioridad válida.';
    if (!newPost.description.trim()) {
      errors.description = 'La descripción es obligatoria.';
    } else if (newPost.description.length > maxPostDescriptionLength) {
      errors.description = `La descripción no puede superar ${maxPostDescriptionLength} caracteres.`;
    }
    return errors;
  };

  const handleSearch = async (params?: { tradeId?: number; query?: string }) => {
    // Strategy Pattern: Seleccionar estrategia según los parámetros
    let strategyType: string;
    let strategyParams: any = {};

    if (params?.query && params.query.trim() !== '') {
      // Búsqueda por texto (nombre de trabajador u oficio)
      strategyType = 'by-text';
      strategyParams = { query: params.query.trim() };
    } else if (params?.tradeId) {
      // Búsqueda por oficio específico
      strategyType = 'by-trade';
      strategyParams = { tradeId: params.tradeId };
    } else {
      // Ver todos los trabajadores
      strategyType = 'all-workers';
      strategyParams = {};
    }

    const strategy = SearchStrategyFactory.create(strategyType);
    try {
      const results = await strategy.execute(strategyParams);
      setSearchResults(results);
    } catch (error) {
      console.error('Error en búsqueda:', error);
      setSearchResults([]);
    }
  };

  const handleCreatePost = async () => {
    const errors = validateNewPost();
    if (Object.keys(errors).length > 0) {
      setPostErrors(errors);
      // Construir mensaje claro de campos faltantes
      const labels: Record<string, string> = {
        tradeId: 'Oficio',
        urgency: 'Prioridad',
        description: 'Descripción'
      };
      const missing = Object.keys(errors).map(k => labels[k] || k);
      setPostNotice({ text: `Completa los siguientes campos: ${missing.join(', ')}.`, type: 'error' });
      return;
    }

    setPostErrors({});
    const res = await fetch('/api/jobs/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_cliente: user.id_cliente,
        descripcion_publi: newPost.description,
        tipo_urgencia: newPost.urgency,
        id_oficio: Number(newPost.tradeId)
      })
    });
    if (res.ok) {
      setIsPosting(false);
      setNewPost({ tradeId: '', description: '', urgency: '' });
      setPostNotice({ text: '', type: null });
      loadInitial();
    }
  };

  const handleUpdateProfile = async () => {
    setIsSaving(true);
    setProfileNotice({ text: '', type: null });
    try {
      const res = await fetch('/api/jobs/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'CLIENT',
          id: user.id_cliente,
          updates: {
            nombre_y_apellido_cliente: profileData.name,
            celular_cliente: profileData.celular_cliente,
            edad_cliente: Number(profileData.edad_cliente)
          }
        })
      });
      if (res.ok) {
        setProfileNotice({ text: 'Perfil actualizado con exito.', type: 'success' });
      } else {
        const errorData = await res.json().catch(() => ({}));
        setProfileNotice({ text: errorData.message || 'No se pudo actualizar el perfil.', type: 'error' });
      }
    } catch {
      setProfileNotice({ text: 'No se pudo conectar con el servidor. Intenta nuevamente.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewPostulations = async (post: any) => {
    setViewingPostulations(post);
    setPostulationsSort('price_asc');
    setIsLoadingPostulations(true);
    try {
      const res = await fetch(`/api/jobs/postulations/${post.id_publi}`);
      if (res.ok) setPostulations(await res.json());
    } finally {
      setIsLoadingPostulations(false);
    }
  };

  const handleClosePost = async (postId: number) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta publicación? Los trabajadores ya no podrán enviarte presupuestos.')) return;
    try {
      const res = await fetch(`/api/jobs/posts/${postId}/close-manual`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: user.id_cliente })
      });
      if (res.ok) {
        // Update local state reactively
        setPosts(prev => prev.map(p => p.id_publi === postId ? { ...p, estado_publi: 'Cancelada' } : p));
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || 'Error al eliminar la publicación.');
      }
    } catch {
      alert('Error de red al intentar eliminar la publicación.');
    }
  };

  const sortedPostulations = React.useMemo(() => {
    const list = [...postulations];
    if (postulationsSort === 'price_asc') {
      return list.sort((a, b) => Number(a.presupuesto || 0) - Number(b.presupuesto || 0));
    }
    return list.sort((a, b) => Number(b.trabajadores?.puntuacion || 0) - Number(a.trabajadores?.puntuacion || 0));
  }, [postulations, postulationsSort]);

  const handleViewWorkerProfile = async (workerId: number) => {
    setSelectedWorkerProfile(null);
    setWorkerProfileError('');
    setIsLoadingWorkerProfile(true);
    try {
      // Strategy Pattern: Usar estrategia de carga de perfil
      const strategy = SearchStrategyFactory.create('profile');
      const profile = await strategy.execute({ workerId });
      setSelectedWorkerProfile(profile);

      // Cargar valoraciones del trabajador de forma independiente
      setIsLoadingWorkerRatings(true);
      try {
        const ratings = await getWorkerRatings(workerId);
        setWorkerRatings(ratings);
      } catch (ratingsError: any) {
        console.error("Error loading worker ratings:", ratingsError);
        // Manejar error de carga de ratings sin bloquear la carga del perfil
        setWorkerRatings([]); // Asegurar que sea un array vacío en caso de error
      } finally {
        setIsLoadingWorkerRatings(false);
      }
    } catch (error: any) {
      setWorkerProfileError(error.message || 'No se pudo cargar el perfil.');
    } finally {
      setIsLoadingWorkerProfile(false);
    }
  };

  const closeWorkerProfile = () => {
    setSelectedWorkerProfile(null);
    setWorkerProfileError('');
    setIsLoadingWorkerProfile(false);
    setWorkerRatings([]); // Limpiar ratings al cerrar el perfil
  };

  const workerProfileOpen = Boolean(selectedWorkerProfile || workerProfileError || isLoadingWorkerProfile);



  // Mensajería
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [openingConversationId, setOpeningConversationId] = useState<number | null>(null);
  const [unreadCountClient, setUnreadCountClient] = useState(0);

  const loadConversations = async () => {
    const res = await fetch(`/api/jobs/conversations?role=CLIENT&userId=${user.id_cliente}`);
    if (res.ok) {
      const data = await res.json();
      setConversations(data);
      const totalUnread = data.reduce((sum: number, c: any) => sum + (c.unread_count || 0), 0);
      setUnreadCountClient(totalUnread);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'messages') {
      loadConversations();
    }
  }, [activeTab]);

  React.useEffect(() => {
    loadConversations();
    const iv = setInterval(loadConversations, 30000);
    return () => clearInterval(iv);
  }, []);

  React.useEffect(() => {
    loadConversations();
  }, [notifications]);

  const openConversation = async (workerId: number, publicationId?: number, postulationId?: number) => {
    setActiveTab('messages');
    setOpeningConversationId(workerId);
    const res = await fetch('/api/jobs/conversations/open', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: user.id_cliente, workerId, publicationId, postulationId })
    });
    if (!res.ok) {
      setOpeningConversationId(null);
      await loadConversations();
      return;
    }
    const payload = await res.json();
    // Backend returns { conversation: {..., counterpart_name, contract}, contract }
    // Merge contract into the conversation object so ConversationModal has it immediately.
    const rawConvo = payload.conversation || payload;
    const convo: ConversationSummary = {
      ...rawConvo,
      contract: rawConvo.contract ?? payload.contract ?? null,
    };
    setSelectedConversation(convo);
    await loadConversations();
    setOpeningConversationId(null);
  };

  const loadMessages = async (conversationId: number) => {
    const res = await fetch(`/api/jobs/conversations/${conversationId}/messages?role=CLIENT&userId=${user.id_cliente}`);
    if (res.ok) setMessages(await res.json());
  };

  const handleSendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return;
    const res = await fetch(`/api/jobs/conversations/${selectedConversation.id_conversacion}/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderId: user.id_cliente, senderRole: 'CLIENT', content: newMessage })
    });
    if (res.ok) {
      setNewMessage('');
      await loadMessages(selectedConversation.id_conversacion);
      await loadConversations();
    }
  };


  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-white border-r border-slate-200 p-6 flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <Logo variant={2} />
        </div>
        <nav className="flex-1 space-y-1">
          <button onClick={() => setActiveTab('search')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm ${activeTab === 'search' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100'}`}><Search className="w-4 h-4"/> Buscar</button>
          <button onClick={() => setActiveTab('posts')} className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl font-bold text-sm ${activeTab === 'posts' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
            <div className="flex items-center gap-3"><FileText className="w-4 h-4"/> Mis Pedidos</div>
            {unreadPosts > 0 && <span className="bg-red-500 text-white font-bold text-[11px] h-5 min-w-5 px-1.5 rounded-full flex items-center justify-center transition-all duration-300">{unreadPosts}</span>}
          </button>
          <button onClick={() => setActiveTab('messages')} className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl font-bold text-sm ${activeTab === 'messages' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
            <div className="flex items-center gap-3"><Inbox className="w-4 h-4"/> Mensajes</div>
            {unreadCountClient > 0 && <span className="bg-red-500 text-white font-bold text-[11px] h-5 min-w-5 px-1.5 rounded-full flex items-center justify-center transition-all duration-300">{unreadCountClient}</span>}
          </button>
          <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm ${activeTab === 'profile' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100'}`}><User className="w-4 h-4"/> Mi Perfil</button>
          <button onClick={() => setActiveTab('history')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm ${activeTab === 'history' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100'}`}><Clock3 className="w-4 h-4"/> Historial</button>
        </nav>
        <div className="pt-6 border-t border-slate-100 flex flex-col gap-4">
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-[10px] text-white font-bold">{user.name?.[0] || 'U'}</div>
             <div className="truncate text-xs font-bold">{user.name || 'Usuario'}</div>
           </div>
           <button onClick={onLogout} className="text-xs font-bold text-red-400 hover:text-red-600 flex items-center gap-2">
             <LogOut className="w-4 h-4"/> Salir
           </button>
        </div>
      </aside>

      <main className="flex-1 p-10 space-y-8 overflow-y-auto">
        {activeTab === 'search' && (
          <div className="space-y-8 max-w-5xl">
            <div className="flex items-center gap-2">
               <div className="relative flex-1">
                 <input 
                   className="input-soft w-full pr-12" 
                   placeholder="Buscar por nombre de trabajador u oficio..." 
                   value={searchQuery} 
                   onChange={e => setSearchQuery(e.target.value)}
                   onKeyDown={e => {
                     if (e.key === 'Enter') {
                       handleSearch({ query: searchQuery });
                     }
                   }}
                 />
                 <button
                   onClick={() => handleSearch({ query: searchQuery })}
                   className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-primary text-white hover:opacity-90 transition-all"
                   title="Buscar"
                 >
                   <Search className="w-4 h-4" />
                 </button>
               </div>
               <Button onClick={() => handleSearch({})} className="px-8 shrink-0">Ver Todos</Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
               {trades.map(t => (
                 <button 
                   key={t.id_oficio} 
                   onClick={() => handleSearch({ tradeId: t.id_oficio })} 
                   className="p-4 bg-white rounded-2xl border border-slate-100 hover:border-accent transition-all text-center flex flex-col items-center gap-2"
                 >
                    <Briefcase className="w-4 h-4 text-primary"/>
                    <span className="text-[10px] font-bold uppercase tracking-tighter">{t.nombre_oficio}</span>
                 </button>
               ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {searchResults.length > 0 ? searchResults.map(w => {
                 // Normalizar nombres de oficios (soporta formato legacy y nuevo)
                 const workerTrades = w.oficios || w.oficio_del_trabajador?.map((ot: any) => ot?.oficios || ot).filter(Boolean) || [];
                 const tradeNames = workerTrades.map((t: any) => t?.nombre_oficio).filter(Boolean).join(', ');
                 return (
                 <Card key={w.id_trabajador} className="p-6 space-y-4">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-primary">{w.nombre_y_apellido_trabajador?.[0]}</div>
                       <div>
                         <h4 className="font-bold text-sm">{w.nombre_y_apellido_trabajador}</h4>
                         {tradeNames && <p className="text-[10px] text-slate-500 font-medium">{tradeNames}</p>}
                         <p className="text-[10px] text-slate-400">Puntaje: {w.puntuacion || '0.0'}</p>
                       </div>
                    </div>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < Math.round(Number(w.puntuacion || 0)) ? 'text-yellow-400 fill-current' : 'text-slate-200'}`}/>
                      ))}
                    </div>
                    {tradeNames && (
                      <div className="flex flex-wrap gap-1">
                        {workerTrades.map((t: any, i: number) => (
                          <span key={t?.id_oficio || i} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {t?.nombre_oficio}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="secondary" className="w-full text-xs" onClick={() => handleViewWorkerProfile(w.id_trabajador)}>Ver Perfil</Button>
                      <Button className="w-full text-xs" onClick={() => openConversation(w.id_trabajador)}>Contactar</Button>
                    </div>
                 </Card>
               )}) : (
                 <div className="col-span-full py-12 text-center text-slate-400 font-medium">
                   {searchQuery.trim() ? `No se encontraron resultados para "${searchQuery.trim()}".` : 'No se encontraron trabajadores en esta categoría.'}
                 </div>
               )}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Mensajes</h2>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={loadConversations}><RefreshCw className="w-4 h-4 mr-2"/>Actualizar</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 space-y-3">
                {conversations.length > 0 ? conversations.map((c: ConversationSummary) => (
                  <div key={c.id_conversacion} className="p-3 hover:shadow-lg cursor-pointer" onClick={async () => { setSelectedConversation(c); await loadMessages(c.id_conversacion); }}>
                    <Card>
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-bold text-sm">{c.counterpart_name || 'Usuario'}</h5>
                          <p className="text-xs text-slate-400">{c.last_message?.contenido_mensaje || c.ultimo_mensaje_preview || 'Sin mensajes'}</p>
                        </div>
                        <div className="text-xs text-slate-400">{c.unread_count ? <span className="bg-primary text-white px-2 py-1 rounded-full text-[10px]">{c.unread_count}</span> : null}</div>
                      </div>
                    </Card>
                  </div>
                )) : (
                  <div className="py-12 text-center text-slate-400">No hay conversaciones aún.</div>
                )}
              </div>

              <div className="md:col-span-2">
                {selectedConversation ? (
                  <ConversationModal open={Boolean(selectedConversation)} conversation={selectedConversation} currentRole={UserRole.CLIENT} currentUserId={user.id_cliente} userName={user.name} onClose={() => setSelectedConversation(null)} onSaved={loadConversations} />
                ) : openingConversationId ? (
                  <Card className="p-8 text-center text-slate-500 space-y-3">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                    <p className="font-bold">Abriendo conversación...</p>
                    <p className="text-sm">Estamos creando o recuperando el chat con el trabajador seleccionado.</p>
                  </Card>
                ) : (
                  <Card className="p-8 text-center text-slate-400">Selecciona una conversación para ver el chat.</Card>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="space-y-8 max-w-4xl">
            <div className="flex justify-between items-center">
               <h2 className="text-2xl font-bold">Mis Publicaciones en Foro</h2>
               <Button onClick={() => setIsPosting(true)}>Nueva Publicación</Button>
            </div>

            {isPosting && (
              <Card className="p-6 space-y-4 bg-primary/5 border-primary/20">
                 {postNotice.text && (
                   <div className={`rounded-2xl p-3 text-sm font-bold text-center ${postNotice.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                     {postNotice.text}
                   </div>
                 )}
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <select
                        className={`input-soft ${postErrors.tradeId ? 'border-red-400 focus:border-red-500' : ''}`}
                        value={newPost.tradeId}
                        onChange={e => {
                          setNewPost((prev) => ({ ...prev, tradeId: e.target.value }));
                          clearPostError('tradeId');
                        }}
                      >
                        <option value="">Selecciona un oficio</option>
                        {trades.map(t => <option key={t.id_oficio} value={t.id_oficio}>{t.nombre_oficio}</option>)}
                      </select>
                      {postErrors.tradeId && <p className="text-xs text-red-600 font-semibold mt-1">{postErrors.tradeId}</p>}
                    </div>
                    <div>
                      <select
                        className={`input-soft ${postErrors.urgency ? 'border-red-400 focus:border-red-500' : ''}`}
                        value={newPost.urgency}
                        onChange={e => {
                          setNewPost((prev) => ({ ...prev, urgency: e.target.value }));
                          clearPostError('urgency');
                        }}
                      >
                        <option value="">Selecciona prioridad</option>
                        <option value="Baja">Baja</option>
                        <option value="Media">Media</option>
                        <option value="Alta">Alta</option>
                      </select>
                      {postErrors.urgency && <p className="text-xs text-red-600 font-semibold mt-1">{postErrors.urgency}</p>}
                    </div>
                 </div>
                 {/* Indicadores de validación dinámica */}
                 <div className="flex flex-wrap gap-4 p-3 bg-white/50 rounded-xl border border-primary/10">
                   <div className="flex items-center gap-2">
                     <div className={`w-2 h-2 rounded-full ${newPost.tradeId ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 animate-pulse'}`} />
                     <span className={`text-xs font-bold ${newPost.tradeId ? 'text-green-600' : 'text-red-600'}`}>Oficio</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className={`w-2 h-2 rounded-full ${newPost.urgency ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 animate-pulse'}`} />
                     <span className={`text-xs font-bold ${newPost.urgency ? 'text-green-600' : 'text-red-600'}`}>Prioridad</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className={`w-2 h-2 rounded-full ${newPost.description.trim() ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 animate-pulse'}`} />
                     <span className={`text-xs font-bold ${newPost.description.trim() ? 'text-green-600' : 'text-red-600'}`}>Descripción</span>
                   </div>
                 </div>
                 <div className="relative">
                   <textarea
                     className={`input-soft min-h-32 resize-none ${postErrors.description ? 'border-red-400 focus:border-red-500' : ''}`}
                     placeholder="Describe qué necesitas (ej: Tengo una filtración en el baño...)"
                     value={newPost.description}
                     maxLength={maxPostDescriptionLength}
                     onChange={e => {
                       const value = e.target.value.slice(0, maxPostDescriptionLength);
                       setNewPost((prev) => ({ ...prev, description: value }));
                       clearPostError('description');
                     }}
                   />
                   <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
                     <span className=""></span>
                     <span className="font-semibold">{newPost.description.length} / {maxPostDescriptionLength}</span>
                   </div>
                   {postErrors.description && <p className="text-xs text-red-600 font-semibold mt-1">{postErrors.description}</p>}
                 </div>
                 <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setIsPosting(false)}>Cancelar</Button>
                    <Button onClick={handleCreatePost} disabled={isSaving || !newPost.description.trim() || !newPost.tradeId || !newPost.urgency}>Publicar</Button>
                 </div>
              </Card>
            )}

            <div className="space-y-4">
               {posts.filter((p: any) => p.estado_publi !== 'Cancelada').length > 0 ? (
                 posts
                   .filter((p: any) => p.estado_publi !== 'Cancelada')
                   .map((p: any) => (
                     <Card key={p.id_publi} className="p-6 flex justify-between items-center">
                        <div className="space-y-1">
                           <div className="flex gap-2 mb-2">
                             <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.tipo_urgencia === 'Alta' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>Urgencia {p.tipo_urgencia}</span>
                             {p.estado_publi === 'Abierta' && (
                               <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">Abierta</span>
                             )}
                             {p.estado_publi === 'En curso' && (
                               <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">En curso</span>
                             )}
                             {p.estado_publi === 'Concretada' && (
                               <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">Concretada</span>
                             )}
                             {p.estado_publi !== 'Abierta' && p.estado_publi !== 'En curso' && p.estado_publi !== 'Concretada' && (
                               <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{p.estado_publi}</span>
                             )}
                           </div>
                           <h4 className="font-bold text-slate-800">{p.oficios?.nombre_oficio}</h4>
                           <p className="text-xs text-slate-500 max-w-lg">{p.descripcion_publi}</p>
                        </div>
                        <div className="flex gap-2">
                          {p.estado_publi === 'Abierta' && (
                            <Button 
                              variant="outline" 
                              className="text-xs border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => handleClosePost(p.id_publi)}
                            >
                              Eliminar Publicación
                            </Button>
                          )}
                          <Button variant="outline" className="text-xs" onClick={() => handleViewPostulations(p)}>Ver Presupuestos</Button>
                        </div>
                     </Card>
                   ))
               ) : (
                  <div className="py-20 text-center text-slate-400">Aún no has realizado ninguna publicación.</div>
               )}
            </div>
          </div>
        )}

        {viewingPostulations && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-2xl w-full">
              <Card className="p-8 space-y-6 bg-white shadow-2xl overflow-y-auto max-h-[80vh]">
                <div className="flex justify-between items-center border-b pb-4">
                  <div>
                    <h3 className="text-xl font-bold">Presupuestos Recibidos</h3>
                    <p className="text-xs text-slate-400 mt-1">{viewingPostulations.descripcion_publi}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      className="input-soft text-xs py-2"
                      value={postulationsSort}
                      onChange={e => setPostulationsSort(e.target.value as 'price_asc' | 'rating_desc')}
                    >
                      <option value="price_asc">Ordenar: Menor precio</option>
                      <option value="rating_desc">Ordenar: Mejor calificacion</option>
                    </select>
                    <Button variant="ghost" onClick={() => setViewingPostulations(null)}>
                      <ChevronLeft className="w-4 h-4 mr-2"/> Volver
                    </Button>
                  </div>
                </div>

                {isLoadingPostulations ? (
                  <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary"/></div>
                ) : sortedPostulations.length > 0 ? (
                  <div className="space-y-4">
                    {sortedPostulations.map((p: any) => (
                      <Card key={p.id_postulacion} className="p-5 border border-slate-100 hover:border-primary/30 transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                              {p.trabajadores?.nombre_y_apellido_trabajador?.[0] || 'T'}
                            </div>
                            <div>
                              <h5 className="font-bold text-sm">{p.trabajadores?.nombre_y_apellido_trabajador}</h5>
                              <div className="flex gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className={`w-2 h-2 ${i < Math.round(Number(p.trabajadores?.puntuacion || 0)) ? 'text-yellow-400 fill-current' : 'text-slate-200'}`}/>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-primary">${p.presupuesto}</div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{new Date(p.fecha_postulacion).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl italic">"{p.descripcion_postulacion}"</p>
                        <div className="mt-4 flex gap-2">
                           <Button 
                             className="w-full text-xs py-2"
                             onClick={() => {
                               setViewingPostulations(null);
                               openConversation(p.id_trabajador, viewingPostulations.id_publi, p.id_postulacion);
                             }}
                           >
                             Contactar
                           </Button>
                           <Button variant="outline" className="w-full text-xs py-2" onClick={() => handleViewWorkerProfile(p.id_trabajador)}>Ver Perfil</Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center text-slate-400">Aún no has recibido presupuestos para esta publicación.</div>
                )}
              </Card>
            </motion.div>
          </div>
        )}

        {workerProfileOpen && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-5xl">
              <Card className="p-0 overflow-hidden bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white p-8 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
                  <div className="flex items-center gap-6">
                    <img
                      src={selectedWorkerProfile?.url_foto_perfil || '/images/logo1.png'}
                      alt="Foto de perfil"
                      className="w-28 h-28 md:w-32 md:h-32 rounded-full object-cover border-4 border-white/10"
                      onError={(e) => {
                        e.currentTarget.src = '/images/logo1.png';
                      }}
                    />
                    <div className="space-y-2">
                      <h3 className="text-3xl font-extrabold tracking-tight">{selectedWorkerProfile?.nombre_y_apellido_trabajador || 'Perfil de trabajador'}</h3>
                      <p className="text-sm text-slate-300">{selectedWorkerProfile?.oficios?.map((o: any) => o.nombre_oficio).join(' • ') || 'Oficio no informado'}</p>
                      {selectedWorkerProfile?.fecha_registro && (
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <CalendarDays className="w-4 h-4" />
                          Miembro desde {new Date(selectedWorkerProfile.fecha_registro).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button variant="primary" className="px-8 py-3 text-base self-start md:self-center" onClick={closeWorkerProfile}>Cerrar perfil</Button>
                </div>

                <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    {isLoadingWorkerProfile ? (
                      <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
                    ) : workerProfileError ? (
                      <Card className="p-6 border border-red-200 bg-red-50 text-red-700 font-semibold">{workerProfileError}</Card>
                    ) : (
                      <>
                        <section className="space-y-3">
                          <h4 className="text-3xl font-extrabold text-slate-900">Trabajos realizados</h4>
                          <p className="text-slate-600">
                            {selectedWorkerProfile?.trabajos_realizados > 0
                              ? `Este profesional tiene ${selectedWorkerProfile.trabajos_realizados} trabajos/postulaciones registrados en la plataforma.`
                              : 'Este profesional aun no tiene trabajos cargados.'}
                          </p>
                        </section>

                        {/* Sección de Resumen de Valoración */}
                        <section className="space-y-4">
                          <h4 className="text-3xl font-extrabold text-slate-900">Valoración</h4>
                          <div className="flex items-center gap-2">
                            <RatingStars rating={Number(selectedWorkerProfile?.puntuacion || 0)} size={5} />
                            <span className="text-xl font-bold text-slate-800">
                              {Number(selectedWorkerProfile?.puntuacion || 0).toFixed(1)} de 5
                            </span>
                          </div>
                          <p className="text-sm text-slate-500">
                            {selectedWorkerProfile?.totalRatings === 0
                              ? 'No hay calificaciones aún'
                              : `${selectedWorkerProfile?.totalRatings} valoraciones`}
                          </p>
                        </section>

                        {/* Sección de Detalle de Valoraciones */}
                        <section className="space-y-4">
                          <h4 className="text-3xl font-extrabold text-slate-900">Opiniones de clientes</h4>
                          {isLoadingWorkerRatings ? (
                            <div className="py-10 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
                          ) : workerRatings.length > 0 ? (
                            <div className="space-y-3">
                              {workerRatings.map((review: Rating) => (
                                <Card key={review.id_valoracion} className="p-4 border border-slate-100">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="font-bold text-sm text-slate-800">{review.nombre_cliente || 'Cliente Anónimo'}</p>
                                    <RatingStars rating={review.puntuacion} size={3} />
                                  </div>
                                  <p className="text-sm text-slate-600">{review.comentario || 'Sin comentario.'}</p>
                                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">
                                    {new Date(review.fecha_valoracion).toLocaleDateString()}
                                  </div>
                                </Card>
                              ))}
                            </div>
                          ) : (
                            <p className="text-slate-500">Este profesional aún no tiene opiniones.</p>
                          )}
                        </section>

                        {/* La sección de valoraciones ha sido trasladada al chat del contrato confirmado */}
                      </>
                    )}
                  </div>

                  <div className="space-y-4">
                    <Card className="p-6 space-y-4 border border-slate-200">
                      <h5 className="text-2xl font-bold text-slate-900">Contacto</h5>
                      <div className="space-y-3 text-sm text-slate-700">
                        <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> {selectedWorkerProfile?.correo_trabajador || 'No informado'}</div>
                        <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> {selectedWorkerProfile?.nro_celular_trabajador || 'No informado'}</div>
                      </div>
                    </Card>

                    <Card className="p-6 space-y-3 border border-slate-200">
                      <h5 className="text-2xl font-bold text-slate-900">Experiencia</h5>
                      <p className="text-sm text-slate-600">Puntuación promedio</p>
                      <div className="flex items-center gap-2">
                        <RatingStars rating={Number(selectedWorkerProfile?.puntuacion || 0)} size={5} />
                        <span className="text-3xl font-extrabold text-primary">{Number(selectedWorkerProfile?.puntuacion || 0).toFixed(1)}</span>
                      </div>
                      <p className="text-sm text-slate-500">Basado en {selectedWorkerProfile?.totalRatings || 0} valoraciones</p>
                    </Card>

                    <Card className="p-6 space-y-3 border border-slate-200">
                      <h5 className="text-2xl font-bold text-slate-900">Habilidades</h5>
                      <div className="flex flex-wrap gap-2">
                        {selectedWorkerProfile?.oficios?.length ? selectedWorkerProfile.oficios.map((trade: any) => (
                          <span key={trade.id_oficio} className="text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary">
                            {trade.nombre_oficio}
                          </span>
                        )) : <p className="text-sm text-slate-500">Sin oficios registrados.</p>}
                      </div>
                    </Card>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto space-y-8">
            <h2 className="text-2xl font-bold">Configuración de Perfil</h2>
            {profileNotice.text && (
              <div className={`rounded-2xl p-4 text-sm font-bold ${profileNotice.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {profileNotice.text}
              </div>
            )}
            <Card className="p-8 space-y-6">
               <div className="space-y-4">
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-400 uppercase">Nombre y Apellido</label>
                     <input className="input-soft" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Celular</label>
                        <input className="input-soft" value={profileData.celular_cliente} onChange={e => setProfileData({...profileData, celular_cliente: e.target.value})} />
                     </div>
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Edad</label>
                        <input className="input-soft" type="number" value={profileData.edad_cliente} onChange={e => setProfileData({...profileData, edad_cliente: e.target.value})} />
                     </div>
                  </div>
               </div>
               <Button onClick={handleUpdateProfile} disabled={isSaving} className="w-full py-4 text-lg">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin mx-auto"/> : 'Guardar Cambios'}
               </Button>
            </Card>
          </div>
        )}

        {activeTab === 'history' && (
          <HistoryTab user={user} role={UserRole.CLIENT} />
        )}
      </main>
    </div>
  );
};

const WorkerDashboard = ({ user, onLogout }: { user: any; onLogout: () => void }) => {
  const [activeTab, setActiveTab] = useState<'forum' | 'profile' | 'messages' | 'history'>('forum');
  const { notifications, unreadCount, markAsRead, markAllAsRead, markSectionAsRead } = useNotifications(user?.id_trabajador, UserRole.WORKER);
  const unreadForum = notifications.filter(n => !n.leido && n.seccion_destino === 'FORO').length;
  const unreadMessages = notifications.filter(n => !n.leido && n.seccion_destino === 'MENSAJERIA').length;

  React.useEffect(() => {
    if (activeTab === 'forum') markSectionAsRead('FORO');
    else if (activeTab === 'messages') markSectionAsRead('MENSAJERIA');
  }, [activeTab, notifications]);
  const [forumPosts, setForumPosts] = useState<any[]>([]);
  const [isPostulating, setIsPostulating] = useState<any>(null);
  const [budget, setBudget] = useState({ price: '', materials: '', message: '' });
  const [postulationNotice, setPostulationNotice] = useState<{ text: string; type: 'success' | 'error' | null }>({ text: '', type: null });
  const [profileNotice, setProfileNotice] = useState<{ text: string; type: 'success' | 'error' | null }>({ text: '', type: null });
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState({ ...user });
  const [isSaving, setIsSaving] = useState(false);

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const workerId = Number(user?.id_trabajador);
      if (!Number.isFinite(workerId)) {
        setForumPosts([]);
        return;
      }

      const res = await fetch(`/api/jobs/posts?workerId=${workerId}`);
      if (res.ok) setForumPosts(await res.json());
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => { loadPosts(); }, []);

  // Mensajería (Worker)
  const [workerConversations, setWorkerConversations] = useState<any[]>([]);
  const [workerSelectedConversation, setWorkerSelectedConversation] = useState<any>(null);
  const [workerMessages, setWorkerMessages] = useState<any[]>([]);
  const [unreadCountWorker, setUnreadCountWorker] = useState(0);
  const [openingWorkerConversationId, setOpeningWorkerConversationId] = useState<number | null>(null);

  const loadWorkerConversations = async () => {
    const res = await fetch(`/api/jobs/conversations?role=WORKER&userId=${user.id_trabajador}`);
    if (res.ok) {
      const data = await res.json();
      setWorkerConversations(data);
      const totalUnread = data.reduce((sum: number, c: any) => sum + (c.unread_count || 0), 0);
      setUnreadCountWorker(totalUnread);
    }
  };

  React.useEffect(() => {
    loadWorkerConversations();
    const iv = setInterval(loadWorkerConversations, 30000);
    return () => clearInterval(iv);
  }, []);

  React.useEffect(() => {
    loadWorkerConversations();
    loadPosts();
  }, [notifications]);

  const openWorkerConversation = (conversation: any) => {
    setActiveTab('messages');
    setWorkerSelectedConversation(conversation);
  };

  const openWorkerConversationToClient = async (clientId: number, publicationId?: number) => {
    setActiveTab('messages');
    setOpeningWorkerConversationId(clientId);
    const res = await fetch('/api/jobs/conversations/open', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, workerId: user.id_trabajador, publicationId })
    });
    if (!res.ok) {
      setOpeningWorkerConversationId(null);
      await loadWorkerConversations();
      return;
    }
    const payload = await res.json();
    const convo = payload.conversation || payload;
    setWorkerSelectedConversation(convo);
    const msgsRes = await fetch(`/api/jobs/conversations/${convo.id_conversacion}/messages?role=WORKER&userId=${user.id_trabajador}`);
    if (msgsRes.ok) setWorkerMessages(await msgsRes.json());
    await loadWorkerConversations();
    setOpeningWorkerConversationId(null);
  };

  const handlePostulate = async () => {
    try {
      const res = await fetch('/api/jobs/postulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_trabajador: user.id_trabajador,
          id_publi: isPostulating.id_publi,
          presupuesto: Number(budget.price),
          descripcion_postulacion: budget.message
        })
      });

      if (res.ok) {
        setIsPostulating(null);
        setBudget({ price: '', materials: '', message: '' });
        setPostulationNotice({ text: 'Postulacion enviada exitosamente.', type: 'success' });
      } else {
        const errorData = await res.json().catch(() => ({}));
        setPostulationNotice({ text: errorData.message || 'No se pudo enviar la postulacion.', type: 'error' });
      }
    } catch {
      setPostulationNotice({ text: 'No se pudo conectar con el servidor. Intenta nuevamente.', type: 'error' });
    }
  };

  const handleUpdateProfile = async () => {
    setIsSaving(true);
    setProfileNotice({ text: '', type: null });
    try {
      const res = await fetch('/api/jobs/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'WORKER',
          id: user.id_trabajador,
          updates: {
            nombre_y_apellido_trabajador: profileData.name,
            nro_celular_trabajador: profileData.nro_celular_trabajador
          }
        })
      });
      if (res.ok) {
        setProfileNotice({ text: 'Perfil actualizado con exito.', type: 'success' });
      } else {
        const errorData = await res.json().catch(() => ({}));
        setProfileNotice({ text: errorData.message || 'No se pudo actualizar el perfil.', type: 'error' });
      }
    } catch {
      setProfileNotice({ text: 'No se pudo conectar con el servidor. Intenta nuevamente.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-white border-r p-6 flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <Logo variant={2} />
        </div>
        <nav className="flex-1 space-y-1">
          <button onClick={() => setActiveTab('forum')} className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl font-bold text-sm ${activeTab === 'forum' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
            <div className="flex items-center gap-3"><MapPin className="w-4 h-4"/> Foro de Trabajos</div>
            {unreadForum > 0 && <span className="bg-red-500 text-white font-bold text-[11px] h-5 min-w-5 px-1.5 rounded-full flex items-center justify-center transition-all duration-300">{unreadForum}</span>}
          </button>
          <button onClick={() => setActiveTab('messages')} className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl font-bold text-sm ${activeTab === 'messages' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
            <div className="flex items-center gap-3"><Inbox className="w-4 h-4"/> Mensajes</div>
            {unreadCountWorker > 0 && <span className="bg-red-500 text-white font-bold text-[11px] h-5 min-w-5 px-1.5 rounded-full flex items-center justify-center transition-all duration-300">{unreadCountWorker}</span>}
          </button>
          <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm ${activeTab === 'profile' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100'}`}><User className="w-4 h-4"/> Mi Perfil</button>
          <button onClick={() => setActiveTab('history')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm ${activeTab === 'history' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100'}`}><Clock3 className="w-4 h-4"/> Historial</button>
        </nav>
        <div className="pt-6 border-t flex flex-col gap-4">
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-[10px] text-white font-bold">{user.name?.[0]}</div>
             <div className="truncate text-xs font-bold">{user.name}</div>
           </div>
           <button onClick={onLogout} className="text-xs font-bold text-red-400 hover:text-red-600 flex items-center gap-2">
             <LogOut className="w-4 h-4"/> Salir
           </button>
        </div>
      </aside>

      <main className="flex-1 p-10 space-y-8 overflow-y-auto max-w-5xl mx-auto">
        {activeTab === 'messages' ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-primary">Mensajes</h2>
              <Button variant="ghost" onClick={loadWorkerConversations} className="text-xs font-bold gap-2">
                <RefreshCw className={`w-3 h-3`} /> Actualizar
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 space-y-3">
                {workerConversations.length > 0 ? workerConversations.map((c: ConversationSummary) => (
                  <div key={c.id_conversacion} className="p-3 hover:shadow-lg cursor-pointer" onClick={() => openWorkerConversation(c)}>
                    <Card>
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-bold text-sm">{c.counterpart_name || 'Usuario'}</h5>
                          <p className="text-xs text-slate-400">{c.last_message?.contenido_mensaje || c.ultimo_mensaje_preview || 'Sin mensajes'}</p>
                        </div>
                        <div className="text-xs text-slate-400">{c.unread_count ? <span className="bg-primary text-white px-2 py-1 rounded-full text-[10px]">{c.unread_count}</span> : null}</div>
                      </div>
                    </Card>
                  </div>
                )) : (
                  <div className="py-12 text-center text-slate-400">No hay conversaciones aún.</div>
                )}
              </div>

              <div className="md:col-span-2">
                {workerSelectedConversation ? (
                  <ConversationModal open={Boolean(workerSelectedConversation)} conversation={workerSelectedConversation} currentRole={UserRole.WORKER} currentUserId={user.id_trabajador} userName={user.name} onClose={() => setWorkerSelectedConversation(null)} onSaved={loadWorkerConversations} />
                ) : openingWorkerConversationId ? (
                  <Card className="p-8 text-center text-slate-500 space-y-3">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                    <p className="font-bold">Abriendo conversación...</p>
                    <p className="text-sm">Estamos creando o recuperando el chat con el cliente seleccionado.</p>
                  </Card>
                ) : (
                  <Card className="p-8 text-center text-slate-400">Selecciona una conversación para ver el chat.</Card>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'forum' ? (
          <>
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-primary">Trabajos Disponibles</h2>
              <Button onClick={loadPosts} variant="ghost" className="text-xs font-bold gap-2">
                <Loader2 className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} /> Actualizar Foro
              </Button>
            </div>

            {postulationNotice.text && (
              <div className={`rounded-2xl p-4 text-sm font-bold ${postulationNotice.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {postulationNotice.text}
              </div>
            )}
            
            <div className="space-y-4">
               {forumPosts.length > 0 ? forumPosts.map(p => (
                 <Card key={p.id_publi} className="p-8 space-y-4 hover:shadow-lg transition-all border-l-4 border-l-primary">
                    <div className="flex justify-between items-start">
                       <div className="space-y-4 flex-1">
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] px-3 py-1 rounded-full font-bold bg-primary/10 text-primary uppercase tracking-widest">{p.oficios?.nombre_oficio}</span>
                            <span className={`text-[10px] px-3 py-1 rounded-full font-bold ${p.tipo_urgencia === 'Alta' ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-700'}`}>Urgencia {p.tipo_urgencia}</span>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-800">{p.clientes?.nombre_y_apellido_cliente}</h3>
                            <p className="text-slate-500 max-w-2xl text-sm leading-relaxed mt-1">{p.descripcion_publi}</p>
                          </div>
                          <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            <span>{new Date(p.fecha_publi).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Cliente Verificado</span>
                          </div>
                       </div>
                        <Button onClick={() => { setIsPostulating(p); setPostulationNotice({ text: '', type: null }); }} className="px-8">Enviar Presupuesto</Button>
                    </div>
                 </Card>
               )) : (
                 <div className="py-20 text-center text-slate-400">No hay publicaciones disponibles en el foro actualmente.</div>
               )}
            </div>

            {isPostulating && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                 <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                   <Card className="max-w-md w-full p-8 space-y-6 bg-white shadow-2xl">
                      <h3 className="text-2xl font-bold text-primary">Nuevo Presupuesto</h3>
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Para: {isPostulating.clientes?.nombre_y_apellido_cliente}</p>
                        <p className="text-xs text-slate-600 line-clamp-2 italic">"{isPostulating.descripcion_publi}"</p>
                      </div>
                      <div className="space-y-4">
                         <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase px-1">Presupuesto Estimado ($)</label>
                            <input className="input-soft" placeholder="Ej: 5000" type="number" value={budget.price} onChange={e => setBudget({...budget, price: e.target.value})} />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase px-1">Materiales Incluidos</label>
                            <input className="input-soft" placeholder="Ej: Cables, tornillos..." value={budget.materials} onChange={e => setBudget({...budget, materials: e.target.value})} />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase px-1">Mensaje Adicional</label>
                            <textarea className="input-soft min-h-24" placeholder="Cuéntale al cliente por qué eres el indicado..." value={budget.message} onChange={e => setBudget({...budget, message: e.target.value})} />
                         </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                         <Button variant="ghost" className="flex-1" onClick={() => setIsPostulating(null)}>Cancelar</Button>
                         <Button className="flex-1" onClick={handlePostulate} disabled={!budget.price}>Enviar Propuesta</Button>
                      </div>
                   </Card>
                 </motion.div>
              </div>
            )}
          </>
        ) : activeTab === 'history' ? (
          <HistoryTab user={user} role={UserRole.WORKER} />
        ) : (
          // Profile section
          <div className="max-w-2xl mx-auto space-y-8">
            <h2 className="text-2xl font-bold">Configuración de Perfil</h2>
            {profileNotice.text && (
              <div className={`rounded-2xl p-4 text-sm font-bold ${profileNotice.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {profileNotice.text}
              </div>
            )}
            <Card className="p-8 space-y-6">
               <div className="space-y-4">
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-400 uppercase">Nombre y Apellido</label>
                     <input className="input-soft" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-400 uppercase">Celular</label>
                     <input className="input-soft" value={profileData.nro_celular_trabajador} onChange={e => setProfileData({...profileData, nro_celular_trabajador: e.target.value})} />
                  </div>
               </div>
               <Button onClick={handleUpdateProfile} disabled={isSaving} className="w-full py-4 text-lg">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin mx-auto"/> : 'Guardar Cambios'}
               </Button>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [view, setView] = useState<'landing' | 'auth' | 'dashboard'>('landing');
  const [initialIsLogin, setInitialIsLogin] = useState(false);
  const [user, setUser] = useState<any>(null);

  const handleStart = (role: UserRole | null, isLogin: boolean = false) => {
    setInitialIsLogin(isLogin);
    setView('auth');
  };

  const handleAuth = (userData: any) => {
    setUser(userData);
    setView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setView('landing');
  };

  const handleBackToLanding = () => {
    setView('landing');
  };

  return (
    <div className="min-h-screen text-slate-900 font-sans selection:bg-accent/30">
      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LandingPage onStart={handleStart} />
          </motion.div>
        )}
        
        {view === 'auth' && (
          <motion.div key="auth" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}>
            <AuthForm 
              initialIsLogin={initialIsLogin} 
              onAuth={handleAuth} 
              onBackToLanding={handleBackToLanding} 
            />
          </motion.div>
        )}

        {view === 'dashboard' && user && (
          <motion.div key="db" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {user.role === UserRole.CLIENT ? (
              <ClientDashboard user={user} onLogout={handleLogout} />
            ) : (
              <WorkerDashboard user={user} onLogout={handleLogout} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
