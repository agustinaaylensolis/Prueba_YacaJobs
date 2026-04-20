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
      <img src="https://raw.githubusercontent.com/BenjaminZimerman/yacajobs-assets/main/logo1.png" alt="Logo" className="w-full h-full object-contain" onError={(e) => {
        // Fallback if the raw github link doesn't work (which it won't until uploaded)
        e.currentTarget.src = "https://picsum.photos/seed/yaca/100/100";
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

const LandingPage = ({ onStart }: { onStart: (role: UserRole | null) => void }) => (
  <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-base/10">
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl w-full text-center space-y-8"
    >
      <div className="flex justify-center mb-8">
        <div className="p-8 bg-white rounded-[4rem] shadow-xl">
           <img src="https://raw.githubusercontent.com/BenjaminZimerman/yacajobs-assets/main/logo2.png" alt="Hero Logo" className="w-64 h-auto" />
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
        <Button onClick={() => onStart(null)} className="text-lg px-12 py-5 shadow-lg shadow-primary/20">
          Comenzar ahora
        </Button>
        <Button 
          variant="outline" 
          className="text-lg px-12 py-5"
          onClick={async () => {
            try {
              const res = await fetch('/api/auth/test-db', { method: 'GET' });
              const data = await res.json();
              alert("Test DB (GET): " + JSON.stringify(data));
            } catch (e: any) {
              alert("Test DB Error: " + e.message);
            }
          }}
        >
          Test DB Connection
        </Button>
        <Button 
          variant="ghost" 
          className="text-lg px-12 py-5"
          onClick={async () => {
            try {
              const res = await fetch('/api/auth/ping');
              const data = await res.json();
              alert("Ping: " + JSON.stringify(data));
            } catch (e: any) {
              alert("Ping Error: " + e.message);
            }
          }}
        >
          Ping Server
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

const AuthForm = ({ onAuth }: { onAuth: (user: any) => void }) => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [step, setStep] = useState(1);
  const [isLogin, setIsLogin] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', dni: '', phone: '', age: '', trade: '',
    files: { dniFront: false, dniBack: false, policeCert: false }
  });

  const trades = ['Carpintero', 'Electricista', 'Albañil', 'Plomero', 'Sastre', 'Mecánico'];

  const validate = () => {
    if (isLogin) return !!(formData.email && formData.password);
    if (step === 1) return !!(formData.email && formData.password);
    if (step === 2) return !!(formData.name || formData.email); // Loosened for testing
    if (step === 3) return true; // Allowed in development/testing
    return false;
  };

  const handleLogin = async () => {
    const payload = {
      correo: formData.email,
      contraseña: formData.password,
      rol: role === UserRole.CLIENT ? 'CLIENT' : 'WORKER'
    };
    
    alert("Intentando login:\n" + JSON.stringify(payload));

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error en el login');
      }

      const result = await response.json();
      onAuth({ ...result.user, role, name: result.user.nombre_y_apellido_cliente || result.user.nombre_y_apellido_trabajador || 'Usuario' });
    } catch (error: any) {
      alert("Error Login: " + error.message);
    }
  };

  const next = async () => {
    if (isLogin) {
      await handleLogin();
      return;
    }
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Registration Payload
      const payload: any = role === UserRole.CLIENT ? {
        correo_cliente: formData.email,
        contraseña_cliente: formData.password,
        nombre_y_apellido_cliente: formData.name,
        dni_cliente: Number(formData.dni),
        edad_cliente: Number(formData.age),
        celular_cliente: formData.phone,
        url_dni_frente: 'https://placeholder.com/dni_f',
        url_dni_dorso: 'https://placeholder.com/dni_d'
      } : {
        correo_trabajador: formData.email,
        contraseña_trabajador: formData.password,
        nombre_y_apellido_trabajador: formData.name,
        dni_trabajador: Number(formData.dni),
        nro_celular_trabajador: formData.phone,
        url_dni_frente_trabajador: 'https://placeholder.com/dni_f',
        url_dni_reverso_trabajador: 'https://placeholder.com/dni_r',
        url_certificado_buena_conducta: 'https://placeholder.com/cert',
        monotributo_trabajador: true,
        matricula_trabajador: 'MAT-123',
        id_oficios: [1] // Defaulting to 1 for MVP logic
      };

      alert(JSON.stringify(payload));

      try {
        const endpoint = role === UserRole.CLIENT ? '/api/auth/register/client' : '/api/auth/register/worker';
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const rawText = await response.text();
          let errorMessage = 'Error en el registro';
          try {
            const errorData = JSON.parse(rawText);
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            errorMessage = `Error ${response.status}: ${rawText.substring(0, 100)}`;
          }
          throw new Error(errorMessage);
        }

        const result = await response.json();
        onAuth({ 
          ...result.user, 
          role, 
          name: result.user.nombre_y_apellido_cliente || result.user.nombre_y_apellido_trabajador || 'Usuario' 
        });
      } catch (error: any) {
        alert("Error: " + error.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-10 space-y-8 bg-white">
        {!role ? (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-primary">Bienvenido a YacaJobs</h2>
              <p className="text-gray-500 mt-2">¿Cómo deseas unirte hoy?</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => setRole(UserRole.CLIENT)}
                className="group p-6 bg-white border border-black/5 rounded-[32px] hover:border-accent transition-all text-left flex items-center justify-between shadow-sm"
              >
                <div>
                  <h3 className="font-bold text-xl text-primary">Soy Cliente</h3>
                  <p className="text-sm text-muted">Busco solucionar un problema en mi casa.</p>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-accent group-hover:translate-x-1 transition-all"/>
              </button>
              <button 
                onClick={() => setRole(UserRole.WORKER)}
                className="group p-6 bg-white border border-black/5 rounded-[32px] hover:border-accent transition-all text-left flex items-center justify-between shadow-sm"
              >
                <div>
                  <h3 className="font-bold text-xl text-primary">Soy Trabajador</h3>
                  <p className="text-sm text-muted">Deseo ofrecer mis servicios y oficios.</p>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-accent group-hover:translate-x-1 transition-all"/>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setRole(null)} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-500">
                <chevron-left className="w-5 h-5"/>
              </button>
              <div>
                <h2 className="text-2xl font-bold text-primary">{isLogin ? 'Iniciar Sesión' : `Registro de ${role === UserRole.CLIENT ? 'Cliente' : 'Trabajador'}`}</h2>
                {!isLogin && <p className="text-xs text-accent font-medium uppercase tracking-widest mt-1">Paso {step} de 3</p>}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {(step === 1 || isLogin) && (
                <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                   <input className="input-soft" placeholder="Correo Electrónico" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                   <input className="input-soft" placeholder="Contraseña" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </motion.div>
              )}

              {step === 2 && !isLogin && (
                <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                   <input className="input-soft" placeholder="Nombre y Apellido completo" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                   <input className="input-soft" placeholder="DNI" value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})} />
                   <div className="flex gap-4">
                     <input className="input-soft" placeholder="Edad" type="number" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} />
                     <input className="input-soft" placeholder="Celular" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                   </div>
                   {formData.age && parseInt(formData.age) < 18 && <p className="text-red-500 text-xs px-2">Debes ser mayor de 18 años.</p>}
                </motion.div>
              )}

              {step === 3 && !isLogin && (
                <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                   <p className="text-sm text-gray-500 px-1">Se requiere adjuntar archivos para validar tu identidad. (Simulado para MVP)</p>
                   
                   <div className="space-y-3">
                     <label className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-all border border-dashed border-gray-300">
                        <span className="text-sm font-medium">DNI Frente (Imagen)</span>
                        <input type="checkbox" checked={formData.files.dniFront} onChange={() => setFormData({...formData, files: {...formData.files, dniFront: !formData.files.dniFront}})} />
                     </label>
                     <label className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-all border border-dashed border-gray-300">
                        <span className="text-sm font-medium">DNI Dorso (Imagen)</span>
                        <input type="checkbox" checked={formData.files.dniBack} onChange={() => setFormData({...formData, files: {...formData.files, dniBack: !formData.files.dniBack}})} />
                     </label>
                     {role === UserRole.WORKER && (
                       <>
                         <label className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-all border border-dashed border-gray-300">
                            <span className="text-sm font-medium">Buena Conducta (PDF)</span>
                            <input type="checkbox" checked={formData.files.policeCert} onChange={() => setFormData({...formData, files: {...formData.files, policeCert: !formData.files.policeCert}})} />
                         </label>
                         <select 
                            className="input-soft appearance-none" 
                            value={formData.trade} 
                            onChange={e => setFormData({...formData, trade: e.target.value})}
                          >
                           <option value="">Selecciona tu oficio principal</option>
                           {trades.map(t => <option key={t} value={t}>{t}</option>)}
                         </select>
                       </>
                     )}
                   </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button onClick={next} disabled={!validate()} className="w-full py-5 text-lg shadow-xl shadow-primary/10">
              {isLogin ? 'Ingresar' : (step === 3 ? 'Finalizar Registro' : 'Continuar')}
            </Button>
            <button 
              onClick={() => { setIsLogin(!isLogin); setStep(1); }}
              className="w-full text-sm text-primary font-bold hover:underline"
            >
              {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};

const ClientDashboard = ({ user, onLogout }: { user: any; onLogout: () => void }) => {
  const [activeTab, setActiveTab] = useState('search');
  const [trades, setTrades] = useState<any[]>([]);
  const [publications, setPublications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: tradesData } = await supabase.from('oficios').select('*');
      const { data: postsData } = await supabase.from('publicaciones').select('*, oficios(nombre_oficio)').limit(3);
      
      if (tradesData) setTrades(tradesData);
      if (postsData) setPublications(postsData);
      setLoading(false);
    }
    fetchData();
  }, []);
  
  return (
    <div className="min-h-screen bg-base flex">
      {/* Sidebar */}
      <aside className="w-72 bg-sidebar border-r border-black/5 p-8 flex flex-col gap-8 sticky top-0 h-screen">
        <Logo variant={2} />
        
        <nav className="flex-1 space-y-2">
          <button 
            onClick={() => setActiveTab('search')}
            className={`sidebar-item w-full ${activeTab === 'search' ? 'active' : ''}`}
          >
            <Search className="w-5 h-5"/>
            <span className="font-bold">Buscar Oficio</span>
          </button>
          <button 
            onClick={() => setActiveTab('posts')}
            className={`sidebar-item w-full ${activeTab === 'posts' ? 'active' : ''}`}
          >
            <FileText className="w-5 h-5"/>
            <span className="font-bold">Mis Publicaciones</span>
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-black/5">
          <div className="soft-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0">
              {user?.name?.charAt(0) || user?.correo_cliente?.charAt(0) || '?'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate text-primary">{user?.name || user?.correo_cliente || 'Usuario'}</p>
              <p className="text-[10px] text-muted">Cliente Particular</p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full mt-4 flex items-center justify-center gap-2 text-sm font-bold text-red-500/70 hover:text-red-500 transition-all p-2">
            <LogOut className="w-4 h-4"/>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 lg:p-12 space-y-8 overflow-y-auto">
        {/* Dynamic Content Area */}
        {activeTab === 'search' ? (
          <div className="space-y-10">
            <div className="flex justify-between items-center">
              <div className="w-2/3 max-w-xl">
                <input 
                  className="input-soft py-5 text-lg" 
                  placeholder="¿Qué servicio necesitas hoy?"
                />
              </div>
              <div className="flex gap-4">
                <Button variant="secondary" className="px-5">Notificaciones</Button>
                <Button className="px-5">Nuevo Pedido</Button>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-primary">Categorías Populares</h2>
              {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary w-8 h-8"/></div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                  {trades.map(trade => (
                    <Card key={trade.id_oficio} className="hover:border-accent/30 hover:translate-y-[-4px] transition-all cursor-pointer group flex items-center gap-6 p-8">
                      <div className="w-14 h-14 bg-base rounded-[18px] flex items-center justify-center shrink-0 group-hover:bg-accent/10 transition-all">
                        <Briefcase className="w-7 h-7 text-primary group-hover:text-accent" />
                      </div>
                      <div>
                        <h3 className="font-bold text-primary text-lg">{trade.nombre_oficio}</h3>
                        <p className="text-xs text-muted">{trade.especialidad_oficio || 'Especialista'}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <Card className="bg-primary p-12 text-white relative overflow-hidden h-64 flex items-center">
              <div className="relative z-10 space-y-4 max-w-sm">
                <h2 className="text-3xl font-bold leading-tight">Publica tu problema en el foro</h2>
                <p className="text-white/70 text-sm">Recibe presupuestos personalizados de los mejores especialistas de tu zona de forma gratuita.</p>
                <Button variant="secondary" className="mt-4 bg-white text-primary hover:bg-white/90">Comenzar Publicación</Button>
              </div>
              <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-[100px]"></div>
            </Card>
          </div>
        ) : (
          <div className="space-y-8">
             <div className="flex justify-between items-center">
               <h2 className="text-3xl font-bold text-primary tracking-tight">Tus pedidos en curso</h2>
               <Button>Nueva Publicación</Button>
             </div>
             <div className="space-y-4">
               {[1, 2].map(i => (
                 <Card key={i} className="flex justify-between items-center p-8">
                   <div className="space-y-3">
                     <div className="flex gap-2">
                       <span className="status-pill bg-red-50 text-red-600">Urgente</span>
                       <span className="status-pill">En Proceso</span>
                     </div>
                     <h3 className="text-xl font-bold text-primary">Reparación de filtración en baño</h3>
                     <div className="flex items-center gap-4 text-xs text-muted font-medium">
                        <span>Palermo, CABA</span>
                        <span>•</span>
                        <span>Hace 2 horas</span>
                        <span>•</span>
                        <span className="text-accent">3 Presupuestos recibidos</span>
                     </div>
                   </div>
                   <div className="flex gap-2">
                     <Button variant="ghost">Eliminar</Button>
                     <Button variant="secondary">Ver Presupuestos</Button>
                   </div>
                 </Card>
               ))}
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

const WorkerDashboard = ({ user, onLogout }: { user: any; onLogout: () => void }) => {
  const [suggestedPosts, setSuggestedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    async function fetchPosts() {
      setLoading(true);
      const { data } = await supabase.from('publicaciones').select('*, clientes(nombre_y_apellido_cliente)').limit(3);
      if (data) setSuggestedPosts(data);
      setLoading(false);
    }
    fetchPosts();
  }, []);
  
  return (
    <div className="min-h-screen bg-base flex">
      {/* Sidebar */}
      <aside className="w-72 bg-sidebar border-r border-black/5 p-8 flex flex-col gap-8 sticky top-0 h-screen">
        <Logo variant={2} />
        
        <nav className="flex-1 space-y-2">
           {['Dashboard', 'Foro de Trabajos', 'Mis Presupuestos', 'Mensajes'].map((item, i) => (
             <button key={item} className={`sidebar-item w-full ${i === 0 ? 'active' : ''}`}>
               {i === 0 && <ChevronRight className="w-4 h-4"/>}
               <span className="font-bold">{item}</span>
             </button>
           ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-black/5">
          <div className="soft-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0">
              {user?.name?.charAt(0) || user?.correo_trabajador?.charAt(0) || '?'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate text-primary">{user?.name || user?.correo_trabajador || 'Usuario'}</p>
              <p className="text-[10px] text-muted">{user?.trade || 'Especialista'}</p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full mt-4 flex items-center justify-center gap-2 text-sm font-bold text-red-500/70 hover:text-red-500 transition-all p-2">
            <LogOut className="w-4 h-4"/>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 lg:p-12 space-y-8 overflow-y-auto">
        <header className="flex justify-between items-center">
          <div className="w-1/2">
            <input 
              className="input-soft py-4" 
              placeholder="Buscar nuevos oficios o zonas..."
            />
          </div>
          <div className="flex gap-4">
             <Button variant="secondary">Notificaciones</Button>
             <Button>Publicar Disponibilidad</Button>
          </div>
        </header>

        <section className="grid grid-cols-12 gap-8 items-start">
          <div className="col-span-8 flex flex-col gap-6">
             <div className="flex justify-between items-end px-2">
                <h2 className="text-2xl font-bold text-primary tracking-tight">Publicaciones Recientes</h2>
                <span className="text-xs text-primary font-bold cursor-pointer uppercase tracking-widest">Ver todas</span>
             </div>

             <div className="space-y-4">
                {loading ? (
                  <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary w-8 h-8"/></div>
                ) : (
                  suggestedPosts.map(post => (
                    <Card key={post.id_publi} className="group hover:border-accent/20 transition-all p-8 flex flex-col gap-6">
                      <div className="flex justify-between items-center">
                         <span className="status-pill">{post.estado}</span>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold text-primary">Urgencia: {post.tipo_urgencia}</h3>
                        <p className="text-gray-600 line-clamp-2">{post.descripcion_publi}</p>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                         <div className="flex items-center gap-4 text-xs text-muted font-medium">
                            <span className="flex items-center gap-1"><MapPin className="w-4 h-4"/> Ubicación no especificada</span>
                            <span>•</span>
                            <span>{new Date(post.fecha_publi).toLocaleDateString()}</span>
                         </div>
                         <Button className="px-8 shadow-sm">Postularme</Button>
                      </div>
                    </Card>
                  ))
                )}
             </div>
          </div>

          <div className="col-span-4 flex flex-col gap-6">
             <Card className="bg-primary text-white p-8 relative overflow-hidden group">
                <h3 className="text-xs uppercase tracking-widest opacity-70 mb-2 font-bold">Tu Reputación</h3>
                <p className="text-5xl font-bold mb-4 tracking-tighter">4.9<span className="text-lg opacity-60 font-normal"> / 5</span></p>
                <div className="flex gap-1 mb-6">
                   {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 text-yellow-400 fill-current"/>)}
                </div>
                <div className="h-1.5 w-full bg-white/20 rounded-full mb-3">
                   <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: '95%' }}></div>
                </div>
                <p className="text-[10px] opacity-80 font-medium">12 trabajos completados este mes</p>
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-all duration-700"></div>
             </Card>

             <Card className="space-y-6">
                <h3 className="font-bold text-lg text-primary">Documentación</h3>
                <div className="space-y-3">
                   {[
                     { label: 'DNI Frente/Dorso', status: 'VERIFICADO', color: 'text-primary' },
                     { label: 'Cert. Antecedentes', status: 'VERIFICADO', color: 'text-primary' },
                     { label: 'Seguro Accidentes', status: 'POR VENCER', color: 'text-orange-500' }
                   ].map(doc => (
                     <div key={doc.label} className="flex items-center justify-between p-4 bg-base rounded-2xl border border-black/5">
                        <span className="text-xs font-bold text-primary/80">{doc.label}</span>
                        <span className={`text-[10px] ${doc.color} font-black tracking-widest`}>{doc.status}</span>
                     </div>
                   ))}
                </div>
                <Button variant="secondary" className="w-full">Gestionar Documentos</Button>
             </Card>
          </div>
        </section>
      </main>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [view, setView] = useState<'landing' | 'auth' | 'dashboard'>('landing');
  const [user, setUser] = useState<any>(null);

  const handleStart = (role: UserRole | null) => {
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
            <AuthForm onAuth={handleAuth} />
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
