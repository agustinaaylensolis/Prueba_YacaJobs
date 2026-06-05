import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle2, Circle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserRole } from '../types';

interface Notification {
  id_notificacion: number;
  id_usuario: number;
  tipo_usuario: string;
  titulo: string;
  mensaje: string;
  id_publi?: number;
  leido: boolean;
  fecha_creacion: string;
}

interface NotificationBellProps {
  userId: number;
  role: UserRole;
  onNotificationClick?: (id_publi?: number) => void;
}

export default function NotificationBell({ userId, role, onNotificationClick }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('id_usuario', userId)
      .eq('tipo_usuario', role)
      .order('fecha_creacion', { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.leido).length);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const roleStr = role === UserRole.CLIENT ? 'CLIENT' : 'WORKER';

    const channel = supabase
      .channel('notificaciones_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones',
          filter: `id_usuario=eq.${userId}`, // Note: Supabase Realtime might need complex filter or just user filtering
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          if (newNotif.tipo_usuario === roleStr) {
            setNotifications((prev) => [newNotif, ...prev]);
            setUnreadCount((count) => count + 1);
          }
        }
      )
      .subscribe();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userId, role]);

  const markAsRead = async (id: number) => {
    const { error } = await supabase
      .from('notificaciones')
      .update({ leido: true })
      .eq('id_notificacion', id);

    if (!error) {
      setNotifications(notifications.map(n => n.id_notificacion === id ? { ...n, leido: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.leido).map(n => n.id_notificacion);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from('notificaciones')
      .update({ leido: true })
      .in('id_notificacion', unreadIds);

    if (!error) {
      setNotifications(notifications.map(n => ({ ...n, leido: true })));
      setUnreadCount(0);
    }
  };

  const handleItemClick = (n: Notification) => {
    if (!n.leido) {
      markAsRead(n.id_notificacion);
    }
    setIsOpen(false);
    if (onNotificationClick) {
      onNotificationClick(n.id_publi);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden">
          <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-sm text-slate-800">Notificaciones</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead} 
                className="text-[10px] font-bold text-primary hover:text-primary/80 uppercase"
              >
                Marcar leídas
              </button>
            )}
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-400 text-sm">
                No tienes notificaciones.
              </div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id_notificacion} 
                  className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors flex gap-3 ${!n.leido ? 'bg-primary/5' : ''}`}
                  onClick={() => handleItemClick(n)}
                >
                  <div className="mt-1">
                    {!n.leido ? (
                      <Circle className="w-2.5 h-2.5 fill-primary text-primary" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3 text-slate-300" />
                    )}
                  </div>
                  <div>
                    <p className={`text-sm ${!n.leido ? 'font-bold text-slate-800' : 'text-slate-600'}`}>
                      {n.titulo}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.mensaje}</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium uppercase">
                      {new Date(n.fecha_creacion).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
