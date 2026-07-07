'use strict';
'use client';

import React, { useState, useEffect } from 'react';

interface GeneratedAsset {
  id: string;
  company_id: string;
  platform_name: 'linkedin' | 'x' | 'instagram';
  generated_text: string;
  media_url?: string;
  approval_status: 'draft' | 'approved' | 'rejected';
  created_at: string;
}

interface UserProfile {
  id: string;
  company_id: string;
  email: string;
  full_name?: string;
  created_at: string;
}

interface PreferenceTemplate {
  id: string;
  company_id: string;
  name: string;
  brand_colors?: string;
  visual_style_guidelines?: string;
  tone_modifier?: string;
  platforms: ('linkedin' | 'x' | 'instagram')[];
  skip_image: boolean;
  visual_format?: string;
  image_model?: string;
  created_at: string;
}

const MOCK_USERS: UserProfile[] = [
  {
    id: '00000000-0000-0000-0000-000000000000',
    company_id: '00000000-0000-0000-0000-000000000000',
    email: 'contacto@puna-tech.com',
    full_name: 'Martín (Puna Tech)',
    created_at: new Date().toISOString()
  }
];

const MOCK_TEMPLATES: PreferenceTemplate[] = [
  {
    id: 'temp-puna-1',
    company_id: '00000000-0000-0000-0000-000000000000',
    name: 'Puna Tech - Carrusel Terracota (FLUX Dev)',
    brand_colors: 'Terracota cálido (#af4c24), caoba profundo (#2a0e0e) y fondo crema suave (#f8f4f0)',
    visual_style_guidelines: 'Estética cálida y orgánica, ilustración 3D minimalista con texturas mate de terracota y cerámica sobre fondo crema limpio, diseño B2B muy premium',
    tone_modifier: 'Profesional, de liderazgo y enfocado en el ahorro de horas operativas y ROI medible',
    platforms: ['linkedin', 'instagram'],
    skip_image: false,
    visual_format: 'carousel',
    image_model: 'black-forest-labs/flux-dev',
    created_at: new Date().toISOString()
  },
  {
    id: 'temp-puna-2',
    company_id: '00000000-0000-0000-0000-000000000000',
    name: 'Puna Tech - Flujo Caoba',
    brand_colors: 'Caoba oscuro (#6d2c2c), terracota (#af4c24) y arena beige (#e8dcc2)',
    visual_style_guidelines: 'Diseño vectorial minimalista técnico y diagramas abstractos de flujos en tonos caoba sobre fondo blanco lino limpio',
    tone_modifier: 'Analítico, persuasivo y sumamente enfocado en resolver cuellos de botella del back-office',
    platforms: ['linkedin', 'x'],
    skip_image: false,
    visual_format: 'single_image',
    image_model: 'black-forest-labs/flux-schnell',
    created_at: new Date().toISOString()
  },
  {
    id: 'temp-puna-3',
    company_id: '00000000-0000-0000-0000-000000000000',
    name: 'Puna Tech - Liderazgo B2B (Solo Texto)',
    brand_colors: 'Terracota (#af4c24) y caoba profundo (#2a0e0e)',
    visual_style_guidelines: 'Texto limpio, sin elementos visuales',
    tone_modifier: 'Provocativo, directo y desafiando la ineficiencia de las tareas manuales corporativas',
    platforms: ['linkedin', 'x'],
    skip_image: true,
    visual_format: 'text_only',
    image_model: 'black-forest-labs/flux-schnell',
    created_at: new Date().toISOString()
  }
];

// Fallback high-quality mock data to keep the UI functional when backend is not configured/accessible
const MOCK_DRAFTS: GeneratedAsset[] = [
  {
    id: 'mock-1',
    company_id: 'puna-tech-uuid',
    platform_name: 'linkedin',
    generated_text: '¿Cuántas horas pierde tu equipo B2B registrando datos manualmente en CRM y planillas cada semana?\n\nLa automatización de procesos mediante agentes autónomos de IA no es solo una optimización operativa: es recuperar el ROI de tiempo de tus ingenieros y analistas. En Puna Tech diseñamos flujos de back-office que se ejecutan 24/7 sin intervención humana.\n\nDeja las tareas repetitivas en manos de agentes inteligentes y reenfoca tu talento en la estrategia.',
    media_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
    approval_status: 'draft',
    created_at: new Date().toISOString()
  },
  {
    id: 'mock-2',
    company_id: 'puna-tech-uuid',
    platform_name: 'x',
    generated_text: 'La fricción en el embudo de ventas B2B cuesta miles de dólares en horas perdidas. Automatizar la calificación de leads con agentes autónomos reduce el tiempo de respuesta de 24 horas a 3 minutos. El software trabajando para tus ingresos, no al revés. #IA #B2B #Automation',
    media_url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=600&auto=format&fit=crop',
    approval_status: 'draft',
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'mock-3',
    company_id: 'puna-tech-uuid',
    platform_name: 'instagram',
    generated_text: 'Desliza para ver cómo un agente de IA califica y procesa pedidos en tu ERP automáticamente. 🤖✨\n\nSlide 1: El problema de la carga de facturas manuales.\nSlide 2: Cómo la IA lee, valida e ingresa datos automáticamente.\nSlide 3: Resultados: Cero errores de transcripción y 15 horas semanales ahorradas.',
    media_url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=600&auto=format&fit=crop',
    approval_status: 'draft',
    created_at: new Date(Date.now() - 7200000).toISOString()
  }
];

export default function Dashboard() {
  const [drafts, setDrafts] = useState<GeneratedAsset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // User Profile States
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeUser, setActiveUser] = useState<UserProfile | null>(null);
  
  // Preference Template States
  const [templates, setTemplates] = useState<PreferenceTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Form State for Manual Generation
  const [formTopic, setFormTopic] = useState<string>('');
  const [formPlatforms, setFormPlatforms] = useState<('linkedin' | 'x' | 'instagram')[]>(['linkedin']);
  const [brandColors, setBrandColors] = useState<string>('');
  const [visualStyle, setVisualStyle] = useState<string>('');
  const [toneModifier, setToneModifier] = useState<string>('');
  const [skipImage, setSkipImage] = useState<boolean>(false);
  const [visualFormat, setVisualFormat] = useState<'text_only' | 'single_image' | 'carousel'>('single_image');
  const [imageModel, setImageModel] = useState<string>('black-forest-labs/flux-schnell');
  
  const [generating, setGenerating] = useState<boolean>(false);
  const [generationSuccess, setGenerationSuccess] = useState<string | null>(null);
  
  // Backend config
  const BACKEND_URL = 'http://127.0.0.1:8000';
  const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000000'; // Default Puna Tech uuid

  const togglePlatform = (plat: 'linkedin' | 'x' | 'instagram') => {
    setFormPlatforms(prev => {
      if (prev.includes(plat)) {
        if (prev.length === 1) return prev; // Keep at least one selected
        return prev.filter(p => p !== plat);
      } else {
        return [...prev, plat];
      }
    });
  };

  const handleCopy = (text: string, e: React.MouseEvent<HTMLButtonElement>) => {
    navigator.clipboard.writeText(text);
    const btn = e.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = `
      <svg class="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
      </svg>
      <span class="text-emerald-400">¡Copiado!</span>
    `;
    setTimeout(() => {
      btn.innerHTML = originalText;
    }, 2000);
  };

  const fetchDrafts = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/generate/drafts`);
      if (res.ok) {
        const data = await res.json();
        // If the database has data, show it. Otherwise fallback to mock data for demo.
        if (data && data.length > 0) {
          setDrafts(data);
        } else {
          setDrafts(MOCK_DRAFTS);
        }
      } else {
        throw new Error('No se pudo conectar al servidor. Mostrando borradores de demostración.');
      }
    } catch (err: any) {
      console.log('Backend disconnected, using mock data:', err.message);
      setDrafts(MOCK_DRAFTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDrafts();
  }, []);

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    // If it's a mock item, update state locally
    if (id.startsWith('mock-')) {
      setDrafts(prev => prev.filter(d => d.id !== id));
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/generate/assets/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      });
      if (res.ok) {
        setDrafts(prev => prev.filter(d => d.id !== id));
      } else {
        alert('Error al actualizar el estado del borrador');
      }
    } catch (err) {
      alert('Error de red al conectar con el backend');
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/users`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setUsers(data);
          setActiveUser(data[0]);
          fetchTemplates(data[0].company_id);
        } else {
          setUsers(MOCK_USERS);
          setActiveUser(MOCK_USERS[0]);
          fetchTemplates(MOCK_USERS[0].company_id);
        }
      } else {
        setUsers(MOCK_USERS);
        setActiveUser(MOCK_USERS[0]);
        fetchTemplates(MOCK_USERS[0].company_id);
      }
    } catch (e) {
      setUsers(MOCK_USERS);
      setActiveUser(MOCK_USERS[0]);
      fetchTemplates(MOCK_USERS[0].company_id);
    }
  };

  const fetchTemplates = async (companyId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/templates?company_id=${companyId}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setTemplates(data);
        } else {
          setTemplates(MOCK_TEMPLATES);
        }
      } else {
        setTemplates(MOCK_TEMPLATES);
      }
    } catch (e) {
      setTemplates(MOCK_TEMPLATES);
    }
  };

  const handleCreateUser = async () => {
    const fullName = prompt('Nombre completo del nuevo usuario:');
    if (!fullName) return;
    const email = prompt('Correo electrónico:');
    if (!email) return;

    const companyId = DEFAULT_COMPANY_ID;

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          full_name: fullName,
          company_id: companyId
        })
      });

      if (res.ok) {
        const newUser = await res.json();
        setUsers(prev => [...prev, newUser]);
        setActiveUser(newUser);
        alert(`¡Usuario ${fullName} creado y seleccionado!`);
      } else {
        throw new Error('API creation failed');
      }
    } catch (e) {
      const mockNewUser: UserProfile = {
        id: `user-${Date.now()}`,
        company_id: companyId,
        email,
        full_name: fullName,
        created_at: new Date().toISOString()
      };
      setUsers(prev => [...prev, mockNewUser]);
      setActiveUser(mockNewUser);
      alert(`[Modo Demo] Usuario ${fullName} creado localmente.`);
    }
  };

  const handleSaveTemplate = async () => {
    if (!activeUser) return;
    const name = prompt('Nombre de la plantilla (ej: Branding Corporativo):');
    if (!name) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          company_id: activeUser.company_id,
          brand_colors: brandColors || undefined,
          visual_style_guidelines: visualStyle || undefined,
          tone_modifier: toneModifier || undefined,
          platforms: formPlatforms,
          skip_image: visualFormat === 'text_only',
          visual_format: visualFormat,
          image_model: imageModel
        })
      });

      if (res.ok) {
        const newTemp = await res.json();
        setTemplates(prev => [...prev, newTemp]);
        setSelectedTemplateId(newTemp.id);
        alert(`¡Plantilla "${name}" guardada con éxito!`);
      } else {
        throw new Error('API save failed');
      }
    } catch (e) {
      const mockNewTemp: PreferenceTemplate = {
        id: `temp-${Date.now()}`,
        company_id: activeUser.company_id,
        name,
        brand_colors: brandColors || undefined,
        visual_style_guidelines: visualStyle || undefined,
        tone_modifier: toneModifier || undefined,
        platforms: formPlatforms,
        skip_image: visualFormat === 'text_only',
        visual_format: visualFormat,
        image_model: imageModel,
        created_at: new Date().toISOString()
      };
      setTemplates(prev => [...prev, mockNewTemp]);
      setSelectedTemplateId(mockNewTemp.id);
      alert(`[Modo Demo] Plantilla "${name}" guardada localmente.`);
    }
  };

  const handleLoadTemplate = (id: string) => {
    setSelectedTemplateId(id);
    if (!id) return;
    const temp = templates.find(t => t.id === id);
    if (temp) {
      setBrandColors(temp.brand_colors || '');
      setVisualStyle(temp.visual_style_guidelines || '');
      setToneModifier(temp.tone_modifier || '');
      setFormPlatforms(temp.platforms);
      setSkipImage(temp.skip_image);
      setVisualFormat(temp.visual_format as any || (temp.skip_image ? 'text_only' : 'single_image'));
      setImageModel(temp.image_model || 'black-forest-labs/flux-schnell');
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTopic.trim() || formPlatforms.length === 0) return;

    setGenerating(true);
    setGenerationSuccess(null);
    setErrorMsg(null);

    const companyId = activeUser ? activeUser.company_id : DEFAULT_COMPANY_ID;

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/generate/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          topic: formTopic,
          platforms: formPlatforms,
          brand_colors: brandColors ? brandColors : undefined,
          visual_style_guidelines: visualStyle ? visualStyle : undefined,
          tone_modifier: toneModifier ? toneModifier : undefined,
          skip_image: visualFormat === 'text_only',
          visual_format: visualFormat,
          image_model: imageModel
        }),
      });

      if (res.ok) {
        const newAssets = await res.json();
        setDrafts(prev => [...newAssets, ...prev]);
        setFormTopic('');
        setGenerationSuccess(`¡Borradores generados con éxito para ${formPlatforms.map(p => p.toUpperCase()).join(', ')}!`);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Error al generar el borrador');
      }
    } catch (err: any) {
      console.error(err);
      const newMockAssets: GeneratedAsset[] = formPlatforms.map(plat => {
        let text = `[Borrador de Demo para ${plat.toUpperCase()} basado en: "${formTopic}"]\n`;
        if (brandColors) text += `[Colores: ${brandColors}]\n`;
        if (visualStyle) text += `[Estilo: ${visualStyle}]\n`;
        if (toneModifier) text += `[Tono: ${toneModifier}]\n`;
        
        if (visualFormat === 'carousel') {
          text += `\n[Formato: Diapositivas / Carrusel]\nSlide 1: Introducción al tema.\nSlide 2: La problemática operativa.\nSlide 3: Solución de Puna Tech.\nSlide 4: Resultados y ROI.`;
        }
        
        text += `\n\nAutomatizar este proceso en Puna Tech ahorra tiempo de desarrollo y minimiza fricciones operativas. #B2B #IA #Demo`;
        
        return {
          id: `mock-${Date.now()}-${plat}`,
          company_id: companyId,
          platform_name: plat,
          generated_text: text,
          media_url: visualFormat === 'text_only' ? undefined : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
          approval_status: 'draft',
          created_at: new Date().toISOString()
        };
      });
      setDrafts(prev => [...newMockAssets, ...prev]);
      setFormTopic('');
      setGenerationSuccess(`[Modo Demo Activo] Borradores simulados creados para ${formPlatforms.map(p => p.toUpperCase()).join(', ')}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-teal-500 selection:text-slate-900">
      
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <span className="font-extrabold text-white text-lg">P</span>
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent">
                Puna Tech
              </h1>
              <p className="text-[10px] text-slate-400 font-mono">B2B CONTENT SYSTEM</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-slate-950/80 border border-slate-850 px-3 py-1.5 rounded-xl">
              <span className="text-xs text-slate-400 font-medium">Perfil:</span>
              <select
                value={activeUser?.id || ''}
                onChange={(e) => {
                  const u = users.find(usr => usr.id === e.target.value);
                  if (u) {
                    setActiveUser(u);
                    fetchTemplates(u.company_id);
                  }
                }}
                className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id} className="bg-slate-950 text-slate-200">
                    {u.full_name || u.email}
                  </option>
                ))}
              </select>
              <button
                onClick={handleCreateUser}
                className="text-teal-400 hover:text-teal-300 p-0.5 ml-1"
                title="Crear Nuevo Usuario"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            <span className="text-sm font-medium text-slate-300 hidden sm:inline">Human-in-the-Loop Activo</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Intro Section */}
        <div className="mb-10">
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            Panel de Aprobación de Contenidos
          </h2>
          <p className="text-slate-400 max-w-2xl">
            Revisa, modifica o aprueba las publicaciones autogeneradas por la IA de Puna Tech. Nada se publicará sin tu confirmación manual.
          </p>
        </div>

        {/* Top Control Section: Generator Form & System Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          
          {/* Generation Request Form */}
          <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
              <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Generar Publicación Manual</span>
            </h3>
            
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Tema o Contexto Operativo
                </label>
                <textarea
                  value={formTopic}
                  onChange={(e) => setFormTopic(e.target.value)}
                  placeholder="Ej. Integración de agentes IA para automatizar carga de facturas en ERP ahorrando 15 horas semanales"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors h-24 resize-none"
                  required
                />
              </div>

              <details className="group border border-slate-850 rounded-xl bg-slate-950/40">
                <summary className="list-none flex items-center justify-between p-4 cursor-pointer select-none text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200">
                  <span>Ajustes de Branding y Diseño (Opcional)</span>
                  <svg className="w-4 h-4 transition-transform duration-300 group-open:rotate-180 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="p-4 pt-0 border-t border-slate-850 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="col-span-full mt-4 flex items-center justify-between gap-4 border-b border-slate-850 pb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cargar Plantilla:</span>
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => handleLoadTemplate(e.target.value)}
                        className="bg-slate-900 border border-slate-800 text-xs font-semibold rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none cursor-pointer"
                      >
                        <option value="">-- Ninguna / Personalizada --</option>
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveTemplate}
                      className="text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2v-9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      <span>Guardar Ajustes como Plantilla</span>
                    </button>
                  </div>

                  <div className="mt-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Paleta de Colores</label>
                    <input
                      type="text"
                      value={brandColors}
                      onChange={(e) => setBrandColors(e.target.value)}
                      placeholder="Ej. Verde esmeralda y gris oscuro"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-colors"
                    />
                  </div>
                  <div className="mt-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Estilo de Imagen</label>
                    <input
                      type="text"
                      value={visualStyle}
                      onChange={(e) => setVisualStyle(e.target.value)}
                      placeholder="Ej. Renders 3D, minimalista, isométrico"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-colors"
                    />
                  </div>
                  <div className="mt-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Tono del Texto</label>
                    <input
                      type="text"
                      value={toneModifier}
                      onChange={(e) => setToneModifier(e.target.value)}
                      placeholder="Ej. Directo, analítico, persuasivo"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-colors"
                    />
                  </div>
                </div>
              </details>

              <div className="flex flex-col sm:flex-row gap-4 justify-between items-end sm:items-center">
                <div className="w-full sm:w-auto">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Canal / Plataforma (Selecciona una o más)
                  </label>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex space-x-2">
                      {(['linkedin', 'x', 'instagram'] as const).map((plat) => {
                        const isSelected = formPlatforms.includes(plat);
                        return (
                          <button
                            key={plat}
                            type="button"
                            onClick={() => togglePlatform(plat)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all duration-300 ${
                              isSelected
                                ? 'bg-gradient-to-r from-teal-500 to-indigo-600 text-white shadow-md'
                                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {plat}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center space-x-2 bg-slate-950/45 px-3 py-1.5 rounded-xl border border-slate-850">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Formato Visual:</span>
                      <select
                        value={visualFormat}
                        onChange={(e) => setVisualFormat(e.target.value as any)}
                        className="bg-transparent text-xs font-bold text-teal-400 focus:outline-none cursor-pointer"
                      >
                        <option value="single_image" className="bg-slate-950 text-slate-200">Imagen Única</option>
                        <option value="carousel" className="bg-slate-950 text-slate-200">Carrusel (Slides)</option>
                        <option value="text_only" className="bg-slate-950 text-slate-200">Solo Texto</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={generating}
                  className="w-full sm:w-auto bg-teal-500 hover:bg-teal-400 disabled:bg-slate-800 text-slate-950 font-bold px-6 py-2.5 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg shadow-teal-500/15"
                >
                  {generating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Generando...</span>
                    </>
                  ) : (
                    <>
                      <span>Solicitar IA</span>
                    </>
                  )}
                </button>
              </div>

              {generationSuccess && (
                <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl text-xs font-medium">
                  {generationSuccess}
                </div>
              )}
            </form>
          </div>

          {/* System Connections and Metrics */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <span>Servicios de Infraestructura</span>
              </h3>
              
              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center py-2 border-b border-slate-850">
                  <span className="text-slate-400">Motor Backend:</span>
                  <span className="text-emerald-400">FastAPI Online</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-850">
                  <span className="text-slate-400">Cognitivo:</span>
                  <span className="text-teal-400">Gemini 3.5 Flash</span>
                </div>
                 <div className="flex justify-between items-center py-1.5 border-b border-slate-850">
                  <span className="text-slate-400">Generación Visual:</span>
                  <select
                    value={imageModel}
                    onChange={(e) => setImageModel(e.target.value)}
                    className="bg-slate-950 border border-slate-850 text-[10px] font-bold text-purple-400 rounded-lg px-2 py-1 focus:outline-none cursor-pointer hover:border-slate-700 transition-colors"
                  >
                    <option value="black-forest-labs/flux-schnell" className="bg-slate-950 text-slate-200">FLUX Schnell (Velocidad)</option>
                    <option value="black-forest-labs/flux-dev" className="bg-slate-950 text-slate-200">FLUX Dev (Calidad / Texto)</option>
                    <option value="stability-ai/sdxl" className="bg-slate-950 text-slate-200">SDXL 1.0 (Básico)</option>
                  </select>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-400">Persistencia:</span>
                  <span className="text-sky-400">Supabase DB</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
              <button 
                onClick={fetchDrafts}
                className="w-full text-center bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white py-2 rounded-xl text-xs font-semibold transition-all"
              >
                Refrescar Cola de Contenidos
              </button>
            </div>
          </div>
        </div>

        {/* Draft List Grid */}
        <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span>Borradores Pendientes ({drafts.length})</span>
        </h3>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Consultando borradores disponibles...</p>
          </div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-800 rounded-3xl">
            <svg className="w-12 h-12 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-slate-400 font-medium">No hay borradores pendientes en la cola.</p>
            <p className="text-slate-600 text-xs mt-1">¡Todo el contenido generado ha sido verificado o la cola está vacía!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {drafts.map((draft) => (
              <div 
                key={draft.id} 
                className="bg-slate-900/30 border border-slate-850 hover:border-slate-750 transition-all duration-300 rounded-2xl overflow-hidden flex flex-col justify-between group shadow-lg hover:shadow-2xl hover:shadow-teal-950/5"
              >
                {/* Platform Badge Header */}
                <div className="px-5 py-4 bg-slate-900/60 flex items-center justify-between border-b border-slate-850">
                  <div className="flex items-center space-x-2">
                    {draft.platform_name === 'linkedin' && (
                      <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-sky-950 text-sky-400 border border-sky-850">
                        LinkedIn Copy
                      </span>
                    )}
                    {draft.platform_name === 'x' && (
                      <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-zinc-900 text-zinc-300 border border-zinc-800">
                        X / Post
                      </span>
                    )}
                    {draft.platform_name === 'instagram' && (
                      <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-pink-950 text-pink-400 border border-pink-900">
                        Instagram Swipe
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {new Date(draft.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Content area */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div className="mb-4">
                    <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap mb-4">
                      {draft.generated_text}
                    </p>
                    <button
                      onClick={(e) => handleCopy(draft.generated_text, e)}
                      className="text-[11px] text-teal-400 hover:text-teal-300 font-bold flex items-center space-x-1.5 border border-teal-500/20 hover:border-teal-500/40 rounded-lg px-2.5 py-1.5 bg-teal-950/20 transition-all select-none"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-5 4h5m-5 4h5m-5 4h5" />
                      </svg>
                      <span>Copiar Texto</span>
                    </button>
                  </div>

                  {/* Image render */}
                  {draft.media_url && (
                    <div className="flex flex-col space-y-2 mb-4">
                      <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={draft.media_url} 
                          alt="AI Visual Suggestion" 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      <div className="flex justify-end">
                        <a 
                          href={draft.media_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[11px] text-teal-400 hover:text-teal-300 font-bold flex items-center space-x-1.5 border border-teal-500/20 hover:border-teal-500/40 rounded-lg px-2.5 py-1.5 bg-teal-950/20 transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          <span>Descargar Imagen</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="p-5 bg-slate-900/20 border-t border-slate-850 grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleAction(draft.id, 'rejected')}
                    className="w-full bg-slate-950 hover:bg-red-950/20 border border-slate-800 hover:border-red-900/30 text-slate-400 hover:text-red-400 py-2.5 rounded-xl text-xs font-bold transition-all duration-300"
                  >
                    Descartar
                  </button>
                  <button
                    onClick={() => handleAction(draft.id, 'approved')}
                    className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-300 shadow-md shadow-teal-500/10"
                  >
                    Aprobar Borrador
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      
      <footer className="border-t border-slate-900 bg-slate-950/50 mt-20 py-8 text-center text-xs text-slate-600">
        <p>© 2026 Puna Tech. Todos los derechos reservados. Diseñado para automatización B2B autónoma.</p>
      </footer>
    </div>
  );
}
