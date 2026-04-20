import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Briefcase, User, LogOut, ChevronRight, FileText, CheckCircle2, Star, ShieldCheck, MapPin, ChevronLeft, Loader2 } from 'lucide-react';
import { COLORS } from './constants';
import { UserRole } from './types';
import { supabase } from './lib/supabase';

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
           <img src="/images/logo2.png" alt="Hero Logo" className="w-64 h-auto" />
        </div>
      </div>
      
      <h1 className="text-6xl font-extrabold text-primary tracking-tight leading-tight">
        Conectamos <span className="text-accent underline decoration-4 underline-offset-8">experiencia</span> con necesidades reales.
      </h1>
      <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
        La plataforma más confiable para encontrar profesionales de oficios en tu zona. 
        Seguridad garantizada y validación rigurosa de identidad.
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

  const validate = () => {
    if (isLogin) return !!(formData.email && formData.password);
    if (step === 1) return !!(formData.email && formData.password);
    if (step === 2) return !!(formData.name && formData.dni && formData.phone && (role === UserRole.WORKER ? true : formData.age));
    if (step === 3) {
      const hasDni = formData.files.dniFront && formData.files.dniBack;
      if (role === UserRole.CLIENT) return !!hasDni;
      return !!(hasDni && formData.files.policeCert && formData.tradeId);
    }
    return false;
  };

  const handleBack = () => {
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

        if (!response.ok) throw new Error((await response.json()).message || 'Error en el login');
        const result = await response.json();
        setMessage({text: '¡Ingreso exitoso!', type: 'success'});
        setTimeout(() => onAuth({ ...result.user, role, name: result.user.nombre_y_apellido_cliente || result.user.nombre_y_apellido_trabajador }), 1000);
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

        if (!response.ok) throw new Error((await response.json()).message || 'Error en el registro');
        const result = await response.json();
        setMessage({text: '¡Registro completado!', type: 'success'});
        setTimeout(() => onAuth({ ...result.user, role, name: result.user.nombre_y_apellido_cliente || result.user.nombre_y_apellido_trabajador }), 1000);
      }
    } catch (error: any) {
      setMessage({text: error.message, type: 'error'});
    } finally {
      setIsLoading(false);
    }
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
              <button onClick={() => setRole(UserRole.CLIENT)} className="group p-6 bg-white border border-black/5 rounded-[32px] hover:border-accent transition-all text-left flex items-center justify-between shadow-sm">
                <div><h3 className="font-bold text-xl text-primary">Soy Cliente</h3><p className="text-sm text-muted">A contratar servicios.</p></div>
                <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-accent group-hover:translate-x-1 transition-all"/>
              </button>
              <button onClick={() => setRole(UserRole.WORKER)} className="group p-6 bg-white border border-black/5 rounded-[32px] hover:border-accent transition-all text-left flex items-center justify-between shadow-sm">
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
                   <input className="input-soft" placeholder="Correo" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                   <input className="input-soft" placeholder="Contraseña" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </motion.div>
              )}
              {step === 2 && !isLogin && (
                <motion.div key="s2" className="space-y-4">
                   <input className="input-soft" placeholder="Nombre completo" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                   <input className="input-soft" placeholder="DNI" value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})} />
                   <div className="flex gap-4">
                     {role === UserRole.CLIENT && <input className="input-soft" placeholder="Edad" type="number" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} />}
                     <input className="input-soft" placeholder="Celular" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                   </div>
                </motion.div>
              )}
              {step === 3 && !isLogin && (
                <motion.div key="s3" className="space-y-4">
                   <div className="space-y-2">
                     <p className="text-xs font-bold text-gray-400 uppercase">Documentación Obligatoria</p>
                     <div className="grid grid-cols-2 gap-4">
                       <button onClick={() => setFormData({...formData, files: {...formData.files, dniFront: {} as File}})} className={`p-4 border-2 rounded-2xl text-xs font-bold ${formData.files.dniFront ? 'border-primary text-primary' : 'border-dashed text-gray-400'}`}>DNI Frente</button>
                       <button onClick={() => setFormData({...formData, files: {...formData.files, dniBack: {} as File}})} className={`p-4 border-2 rounded-2xl text-xs font-bold ${formData.files.dniBack ? 'border-primary text-primary' : 'border-dashed text-gray-400'}`}>DNI Dorso</button>
                     </div>
                     {role === UserRole.WORKER && (
                       <>
                         <button onClick={() => setFormData({...formData, files: {...formData.files, policeCert: {} as File}})} className={`w-full p-4 border-2 rounded-2xl text-xs font-bold ${formData.files.policeCert ? 'border-primary text-primary' : 'border-dashed text-gray-400'}`}>Antecedentes Penales</button>
                         <select className="input-soft" value={formData.tradeId} onChange={e => setFormData({...formData, tradeId: e.target.value})}>
                           <option value="">Selecciona tu Oficio</option>
                           {trades.map(t => <option key={t.id_oficio} value={t.id_oficio}>{t.nombre_oficio}</option>)}
                         </select>
                       </>
                     )}
                   </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button onClick={() => (isLogin || step === 3) ? handleAuthOperation() : setStep(step + 1)} disabled={!validate() || isLoading} className="w-full py-4 text-lg flex justify-center items-center gap-2">
              {isLoading && <Loader2 className="w-5 h-5 animate-spin"/>}
              {isLogin ? 'Ingresar' : (step === 3 ? 'Finalizar' : 'Siguiente')}
            </Button>
            <button onClick={() => { setIsLogin(!isLogin); setStep(1); }} className="w-full text-sm font-bold text-primary hover:underline">
              {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Ingresa'}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};

const ClientDashboard = ({ user, onLogout }: { user: any; onLogout: () => void }) => {
  const [activeTab, setActiveTab] = useState<'search' | 'posts' | 'profile'>('search');
  const [trades, setTrades] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [newPost, setNewPost] = useState({ tradeId: '', description: '', urgency: 'Baja' });
  const [profileData, setProfileData] = useState({ ...user });
  const [isSaving, setIsSaving] = useState(false);
  const [viewingPostulations, setViewingPostulations] = useState<any>(null);
  const [postulations, setPostulations] = useState<any[]>([]);
  const [isLoadingPostulations, setIsLoadingPostulations] = useState(false);

  const loadInitial = async () => {
    const [tRes, pRes] = await Promise.all([
      fetch('/api/jobs/trades'),
      fetch(`/api/jobs/posts?clientId=${user.id_cliente}`)
    ]);
    if (tRes.ok) setTrades(await tRes.json());
    if (pRes.ok) setPosts(await pRes.json());
  };

  React.useEffect(() => { loadInitial(); }, []);

  const handleSearch = async (tradeId?: number) => {
    const res = await fetch(`/api/jobs/workers${tradeId ? `?tradeId=${tradeId}` : ''}`);
    if (res.ok) setSearchResults(await res.json());
  };

  const handleCreatePost = async () => {
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
      loadInitial();
    }
  };

  const handleUpdateProfile = async () => {
    setIsSaving(true);
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
        alert('Perfil actualizado con éxito');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewPostulations = async (post: any) => {
    setViewingPostulations(post);
    setIsLoadingPostulations(true);
    try {
      const res = await fetch(`/api/jobs/postulations/${post.id_publi}`);
      if (res.ok) setPostulations(await res.json());
    } finally {
      setIsLoadingPostulations(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-white border-r border-slate-200 p-6 flex flex-col gap-8">
        <Logo variant={2} />
        <nav className="flex-1 space-y-1">
          <button onClick={() => setActiveTab('search')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm ${activeTab === 'search' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100'}`}><Search className="w-4 h-4"/> Buscar</button>
          <button onClick={() => setActiveTab('posts')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm ${activeTab === 'posts' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100'}`}><FileText className="w-4 h-4"/> Mis Pedidos</button>
          <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm ${activeTab === 'profile' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100'}`}><User className="w-4 h-4"/> Mi Perfil</button>
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
            <div className="flex items-center gap-4">
               <input 
                 className="input-soft flex-1" 
                 placeholder="¿Qué oficio necesitas?" 
                 value={searchQuery} 
                 onChange={e => setSearchQuery(e.target.value)} 
               />
               <Button onClick={() => handleSearch()} className="px-8">Ver Todos</Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
               {trades.map(t => (
                 <button 
                   key={t.id_oficio} 
                   onClick={() => handleSearch(t.id_oficio)} 
                   className="p-4 bg-white rounded-2xl border border-slate-100 hover:border-accent transition-all text-center flex flex-col items-center gap-2"
                 >
                    <Briefcase className="w-4 h-4 text-primary"/>
                    <span className="text-[10px] font-bold uppercase tracking-tighter">{t.nombre_oficio}</span>
                 </button>
               ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {searchResults.length > 0 ? searchResults.map(w => (
                 <Card key={w.id_trabajador} className="p-6 space-y-4">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-primary">{w.nombre_y_apellido_trabajador?.[0]}</div>
                       <div>
                         <h4 className="font-bold text-sm">{w.nombre_y_apellido_trabajador}</h4>
                         <p className="text-[10px] text-slate-400">Puntaje: {w.puntuacion || '0.0'}</p>
                       </div>
                    </div>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < Math.round(Number(w.puntuacion || 0)) ? 'text-yellow-400 fill-current' : 'text-slate-200'}`}/>
                      ))}
                    </div>
                    <Button variant="secondary" className="w-full text-xs">Ver Perfil</Button>
                 </Card>
               )) : (
                 <div className="col-span-full py-12 text-center text-slate-400 font-medium">No se encontraron trabajadores en esta categoría.</div>
               )}
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
                 <div className="grid grid-cols-2 gap-4">
                    <select className="input-soft" value={newPost.tradeId} onChange={e => setNewPost({...newPost, tradeId: e.target.value})}>
                       <option value="">Oficio Requerido</option>
                       {trades.map(t => <option key={t.id_oficio} value={t.id_oficio}>{t.nombre_oficio}</option>)}
                    </select>
                    <select className="input-soft" value={newPost.urgency} onChange={e => setNewPost({...newPost, urgency: e.target.value})}>
                       <option value="Baja">Baja</option><option value="Media">Media</option><option value="Alta">Alta</option>
                    </select>
                 </div>
                 <textarea 
                   className="input-soft min-h-32" 
                   placeholder="Describe qué necesitas (ej: Tengo una filtración en el baño...)" 
                   value={newPost.description} 
                   onChange={e => setNewPost({...newPost, description: e.target.value})} 
                 />
                 <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setIsPosting(false)}>Cancelar</Button>
                    <Button onClick={handleCreatePost} disabled={!newPost.description || !newPost.tradeId}>Publicar</Button>
                 </div>
              </Card>
            )}

            <div className="space-y-4">
               {posts.length > 0 ? posts.map(p => (
                 <Card key={p.id_publi} className="p-6 flex justify-between items-center">
                    <div className="space-y-1">
                       <div className="flex gap-2 mb-2">
                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.tipo_urgencia === 'Alta' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>Urgencia {p.tipo_urgencia}</span>
                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600`}>{p.estado_publi}</span>
                       </div>
                       <h4 className="font-bold text-slate-800">{p.oficios?.nombre_oficio}</h4>
                       <p className="text-xs text-slate-500 max-w-lg">{p.descripcion_publi}</p>
                    </div>
                    <Button variant="outline" className="text-xs" onClick={() => handleViewPostulations(p)}>Ver Presupuestos</Button>
                 </Card>
               )) : (
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
                  <Button variant="ghost" onClick={() => setViewingPostulations(null)}>
                    <ChevronLeft className="w-4 h-4 mr-2"/> Volver
                  </Button>
                </div>

                {isLoadingPostulations ? (
                  <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary"/></div>
                ) : postulations.length > 0 ? (
                  <div className="space-y-4">
                    {postulations.map((p: any) => (
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
                           <Button className="w-full text-xs py-2">Contactar</Button>
                           <Button variant="outline" className="w-full text-xs py-2">Ver Perfil</Button>
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

        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto space-y-8">
            <h2 className="text-2xl font-bold">Configuración de Perfil</h2>
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
      </main>
    </div>
  );
};

const WorkerDashboard = ({ user, onLogout }: { user: any; onLogout: () => void }) => {
  const [activeTab, setActiveTab] = useState<'forum' | 'profile'>('forum');
  const [forumPosts, setForumPosts] = useState<any[]>([]);
  const [isPostulating, setIsPostulating] = useState<any>(null);
  const [budget, setBudget] = useState({ price: '', materials: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState({ ...user });
  const [isSaving, setIsSaving] = useState(false);

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/jobs/posts');
      if (res.ok) setForumPosts(await res.json());
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => { loadPosts(); }, []);

  const handlePostulate = async () => {
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
      alert('¡Postulación enviada exitosamente!');
    } else {
      const errorData = await res.json();
      alert(`Error al enviar presupuesto: ${errorData.message || 'Error desconocido'}`);
    }
  };

  const handleUpdateProfile = async () => {
    setIsSaving(true);
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
        alert('Perfil actualizado con éxito');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-white border-r p-6 flex flex-col gap-8">
        <Logo variant={2} />
        <nav className="flex-1 space-y-1">
          <button onClick={() => setActiveTab('forum')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm ${activeTab === 'forum' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100'}`}><MapPin className="w-4 h-4"/> Foro de Trabajos</button>
          <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm ${activeTab === 'profile' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100'}`}><User className="w-4 h-4"/> Mi Perfil</button>
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
        {activeTab === 'forum' && (
          <>
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-primary">Trabajos Disponibles</h2>
              <Button onClick={loadPosts} variant="ghost" className="text-xs font-bold gap-2">
                <Loader2 className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} /> Actualizar Foro
              </Button>
            </div>
            
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
                       <Button onClick={() => setIsPostulating(p)} className="px-8">Enviar Presupuesto</Button>
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
        )}

        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto space-y-8">
            <h2 className="text-2xl font-bold">Configuración de Perfil</h2>
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
