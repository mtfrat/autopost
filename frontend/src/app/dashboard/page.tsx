'use strict';
'use client';

import React, { useState, useEffect, useRef } from 'react';

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

interface CalendarEntry {
  day: number;
  phase: 1 | 2 | 3 | 4;
  phaseName: string;
  topic: string;
  format: 'carousel' | 'single_image' | 'text_only';
  platforms: ('linkedin' | 'x' | 'instagram')[];
  fluxPrompt: string | null;
}

const EDITORIAL_CALENDAR: CalendarEntry[] = [
  // Phase 1: Educación y Problematización (Días 1-7)
  { day: 1, phase: 1, phaseName: 'Educación', topic: '¿Qué es un Sistema Agéntico Autónomo? La evolución post-LLM.', format: 'carousel', platforms: ['linkedin'], fluxPrompt: 'Nodos de red 3D interconectados brillando en Terracota oscuro, fondo minimalista, texto "BEYOND CHATBOTS".' },
  { day: 2, phase: 1, phaseName: 'Educación', topic: 'El cuello de botella de tu equipo de operaciones no es la falta de personal.', format: 'text_only', platforms: ['x', 'linkedin'], fluxPrompt: null },
  { day: 3, phase: 1, phaseName: 'Educación', topic: 'Automatización Simple vs. Automatización de Extremo a Extremo.', format: 'single_image', platforms: ['linkedin'], fluxPrompt: 'Infografía corporativa limpia en colores Crema y Caoba comparando un proceso lineal con un proceso agéntico circular.' },
  { day: 4, phase: 1, phaseName: 'Educación', topic: 'El verdadero costo del mantenimiento de software (y cómo los agentes lo eliminan).', format: 'carousel', platforms: ['linkedin'], fluxPrompt: 'Estética de terminal financiera, gráficos de barras descendentes en verde neón, tipografía Geist técnica.' },
  { day: 5, phase: 1, phaseName: 'Educación', topic: '¿Por qué las herramientas "No-Code" fallan al escalar en flujos complejos?', format: 'single_image', platforms: ['x'], fluxPrompt: 'Render isométrico de servidores de datos abstractos, estilo vidrio esmerilado corporativo.' },
  { day: 6, phase: 1, phaseName: 'Educación', topic: 'ROI Cuantificable: Cómo medir el éxito de una implementación de IA en B2B.', format: 'text_only', platforms: ['linkedin'], fluxPrompt: null },
  { day: 7, phase: 1, phaseName: 'Educación', topic: 'Resumen de la semana: De la Estrategia al Éxito mediante agentes.', format: 'single_image', platforms: ['instagram'], fluxPrompt: 'Espacio de oficina minimalista moderno, monitor mostrando flujos de trabajo autónomos en la paleta oficial de Puna Tech.' },
  // Phase 2: Casos de Uso (Días 8-15)
  { day: 8, phase: 2, phaseName: 'Casos de Uso', topic: 'Un equipo de ventas operado por IA: Desde la prospección hasta el contrato.', format: 'carousel', platforms: ['linkedin'], fluxPrompt: 'Diagrama de flujo hiper-realista sobre un escritorio, documentos digitales transformándose en datos estructurados.' },
  { day: 9, phase: 2, phaseName: 'Casos de Uso', topic: 'Agentes de conciliación financiera: Eliminando el error humano en FinOps.', format: 'single_image', platforms: ['x', 'linkedin'], fluxPrompt: 'Render macro de código corriendo sobre una base de datos segura, iluminación dramática color Terracota.' },
  { day: 10, phase: 2, phaseName: 'Casos de Uso', topic: 'Infraestructura de Software Personalizada: Encaje perfecto, no plantillas.', format: 'text_only', platforms: ['linkedin'], fluxPrompt: null },
  { day: 11, phase: 2, phaseName: 'Casos de Uso', topic: 'Atención al cliente Tier 3 resuelta por enjambres de agentes autónomos.', format: 'carousel', platforms: ['instagram'], fluxPrompt: 'Múltiples esferas de IA orbitando un núcleo central, renderización 3D cristalina, tipografía clara en las tarjetas.' },
  { day: 12, phase: 2, phaseName: 'Casos de Uso', topic: 'La diferencia entre automatizar una tarea y automatizar una decisión.', format: 'single_image', platforms: ['linkedin'], fluxPrompt: 'Tablero de ajedrez abstracto de cristal donde una pieza luminosa se mueve sola, simbolizando autonomía algorítmica.' },
  { day: 13, phase: 2, phaseName: 'Casos de Uso', topic: 'Reducción de la carga cognitiva gerencial a través de reportes sintetizados por IA.', format: 'single_image', platforms: ['x'], fluxPrompt: 'Pantalla translúcida mostrando métricas financieras simplificadas en un entorno de oficina ejecutiva nocturna.' },
  { day: 14, phase: 2, phaseName: 'Casos de Uso', topic: 'Seguridad y Privacidad en despliegues agénticos multi-tenant.', format: 'text_only', platforms: ['linkedin'], fluxPrompt: null },
  { day: 15, phase: 2, phaseName: 'Casos de Uso', topic: 'Escalando operaciones logísticas sin contratar más coordinadores humanos.', format: 'single_image', platforms: ['linkedin'], fluxPrompt: 'Mapa topográfico digital con rutas de suministro optimizadas en tiempo real, colores corporativos Caoba y Crema.' },
  // Phase 3: Arquitectura Técnica (Días 16-23)
  { day: 16, phase: 3, phaseName: 'Arquitectura', topic: 'Orquestación Multi-Agente: Cómo hacemos que los modelos de IA colaboren entre sí.', format: 'carousel', platforms: ['linkedin'], fluxPrompt: 'Diagrama isométrico complejo, servidores conectándose con nodos de lenguaje natural (LLM) en la nube.' },
  { day: 17, phase: 3, phaseName: 'Arquitectura', topic: 'Diseñando software que se repara a sí mismo (Libre de Mantenimiento).', format: 'single_image', platforms: ['x'], fluxPrompt: 'Estética Cyberpunk corporativa limpia, engranajes digitales auto-ensamblándose.' },
  { day: 18, phase: 3, phaseName: 'Arquitectura', topic: 'Latencia y Rendimiento en arquitecturas LLM corporativas.', format: 'text_only', platforms: ['linkedin'], fluxPrompt: null },
  { day: 19, phase: 3, phaseName: 'Arquitectura', topic: 'Human-in-the-Loop (HITL): Cuándo la IA decide y cuándo el humano aprueba.', format: 'carousel', platforms: ['instagram'], fluxPrompt: 'Interfaz tipo Autopost generada por IA, botón Aprobar resaltado en color Terracota, diseño minimalista UI.' },
  { day: 20, phase: 3, phaseName: 'Arquitectura', topic: 'Gestión de contexto y memoria de largo plazo en Agentes B2B.', format: 'single_image', platforms: ['linkedin'], fluxPrompt: 'Archivero infinito digital y abstracto, iluminado por haces de luz que representan la recuperación de vectores (RAG).' },
  { day: 21, phase: 3, phaseName: 'Arquitectura', topic: 'Integración de sistemas legacy (viejos) con infraestructuras cognitivas modernas.', format: 'text_only', platforms: ['x'], fluxPrompt: null },
  { day: 22, phase: 3, phaseName: 'Arquitectura', topic: 'Personalización del Modelo: Por qué afinamos la IA para tu lógica de negocio.', format: 'single_image', platforms: ['linkedin'], fluxPrompt: 'Render 3D de un microchip estilizado adaptándose a la forma de una huella dactilar, paleta Crema cálida.' },
  { day: 23, phase: 3, phaseName: 'Arquitectura', topic: 'El stack tecnológico de Puna Tech (Visión general de nuestra robustez).', format: 'carousel', platforms: ['linkedin'], fluxPrompt: 'Infografía con logos estilizados (Python, Next.js, Postgres) sobre fondo oscuro, tipografía de alto contraste (Inter).' },
  // Phase 4: Conversión y Acción Directa (Días 24-30)
  { day: 24, phase: 4, phaseName: 'Conversión', topic: 'Calcula el costo de oportunidad de no automatizar tus procesos hoy.', format: 'single_image', platforms: ['linkedin'], fluxPrompt: 'Gráfico financiero proyectado en un cristal corporativo, mostrando una curva de crecimiento exponencial.' },
  { day: 25, phase: 4, phaseName: 'Conversión', topic: 'Auditoría de Flujos de Trabajo: El primer paso hacia un Sistema Agéntico.', format: 'carousel', platforms: ['linkedin'], fluxPrompt: 'Documento de blueprint sobre una mesa técnica, iluminación de estudio profesional. Texto: "AI AUDIT".' },
  { day: 26, phase: 4, phaseName: 'Conversión', topic: 'Deja de comprar software, comienza a construir ventajas operativas escalables.', format: 'text_only', platforms: ['x'], fluxPrompt: null },
  { day: 27, phase: 4, phaseName: 'Conversión', topic: 'Impacto Medible: ¿Qué métricas importan cuando despliegas una IA personalizada?', format: 'single_image', platforms: ['instagram'], fluxPrompt: 'Dashboard de KPIs súper limpio (UI/UX flat design), colores corporativos resaltando los porcentajes de ahorro.' },
  { day: 28, phase: 4, phaseName: 'Conversión', topic: 'Del mapeo de procesos al despliegue: Así es trabajar con Puna Tech.', format: 'carousel', platforms: ['linkedin'], fluxPrompt: 'Línea de tiempo visual elegante (Timeline) con hitos (Discovery, Build, Deploy, Scale).' },
  { day: 29, phase: 4, phaseName: 'Conversión', topic: 'Preparando tu negocio B2B para la era de la IA de enjambre (Swarm AI).', format: 'text_only', platforms: ['linkedin'], fluxPrompt: null },
  { day: 30, phase: 4, phaseName: 'Conversión', topic: 'Hablemos de tu operación. Agenda una consulta técnica estratégica con nosotros.', format: 'single_image', platforms: ['linkedin', 'x'], fluxPrompt: 'Fotografía corporativa hiperrealista de una sala de conferencias moderna y vacía, invitando al espectador a tomar asiento.' },
];

function CarouselPreview({ urls }: { urls: string[] }) {
  const [index, setIndex] = useState(0);

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((prev) => (prev + 1) % urls.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((prev) => (prev - 1 + urls.length) % urls.length);
  };

  return (
    <div className="relative aspect-video rounded-sm overflow-hidden border border-caoba/30 bg-caoba-black group/carpreview">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img 
        src={urls[index]} 
        alt={`Slide ${index + 1}`} 
        className="w-full h-full object-cover transition-all duration-300"
      />
      
      {/* Dots overlay */}
      <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-1.5 z-10">
        {urls.map((_, i) => (
          <div 
            key={i} 
            className={`w-1.5 h-1.5 rounded-full transition-all ${i === index ? 'bg-terracota scale-110' : 'bg-crema/40'}`} 
          />
        ))}
      </div>

      {/* Slide Index Badge */}
      <div className="absolute top-2 right-2 bg-caoba-black/80 border border-caoba/40 text-crema text-[8px] font-mono px-1.5 py-0.5 rounded-sm tracking-wider">
        SLIDE {index + 1}/{urls.length}
      </div>

      {/* Prev Button */}
      <button 
        type="button"
        onClick={handlePrev}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-sm bg-caoba-black/80 border border-caoba/40 text-crema hover:text-terracota flex items-center justify-center transition-all opacity-0 group-hover/carpreview:opacity-100 cursor-pointer z-10"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Next Button */}
      <button 
        type="button"
        onClick={handleNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-sm bg-caoba-black/80 border border-caoba/40 text-crema hover:text-terracota flex items-center justify-center transition-all opacity-0 group-hover/carpreview:opacity-100 cursor-pointer z-10"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

const renderMediaPreview = (mediaUrl: string | undefined) => {
  if (!mediaUrl) return null;
  
  if (mediaUrl.trim().startsWith('[')) {
    try {
      const urls: string[] = JSON.parse(mediaUrl);
      if (Array.isArray(urls) && urls.length > 0) {
        return <CarouselPreview urls={urls} />;
      }
    } catch (e) {
      console.error("Failed to parse media_url as JSON array:", e);
    }
  }

  return (
    <div className="relative aspect-video rounded-sm overflow-hidden border border-caoba/30 bg-caoba-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img 
        src={mediaUrl} 
        alt="AI Suggestion" 
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
      />
    </div>
  );
};

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
  const [imageModel, setImageModel] = useState<string>('black-forest-labs/flux-2-pro');
  
  const [generating, setGenerating] = useState<boolean>(false);
  const [generationSuccess, setGenerationSuccess] = useState<string | null>(null);

  // Added Custom States for Enhancements
  const [hoursSaved, setHoursSaved] = useState<number>(24.5);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<'cards' | 'kanban' | 'table'>('cards');
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set());

  // Refs for focusing elements or logs autoscroll
  const consoleBottomRef = useRef<HTMLDivElement>(null);
  
  // Backend config
  const BACKEND_URL = 'http://127.0.0.1:8000';
  const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000000'; // Default Puna Tech uuid

  // Load Time ROI Metric on Mount
  useEffect(() => {
    const savedHours = localStorage.getItem('puna_hours_saved');
    if (savedHours !== null) {
      setHoursSaved(parseFloat(savedHours));
    } else {
      localStorage.setItem('puna_hours_saved', '24.5');
    }
  }, []);

  // Sync log scroll
  useEffect(() => {
    if (consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs]);

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
      <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
      </svg>
      <span class="text-emerald-400 font-mono text-[10px]">COPIED</span>
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

  // Keyboard Navigation & Shortcuts Effect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if inside text inputs/textarea
      if (
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      // We navigate only active "draft" status assets
      const pendingDrafts = drafts.filter(d => d.approval_status === 'draft');
      if (pendingDrafts.length === 0) return;

      const currentIndex = pendingDrafts.findIndex(d => d.id === activeDraftId);

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentIndex < pendingDrafts.length - 1) {
          setActiveDraftId(pendingDrafts[currentIndex + 1].id);
        } else {
          setActiveDraftId(pendingDrafts[0].id); // loop back
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentIndex > 0) {
          setActiveDraftId(pendingDrafts[currentIndex - 1].id);
        } else {
          setActiveDraftId(pendingDrafts[pendingDrafts.length - 1].id); // loop to end
        }
      } else if (e.key === 'a' || e.key === 'A') {
        if (activeDraftId) {
          e.preventDefault();
          handleAction(activeDraftId, 'approved');
          // Find next active item to auto-focus
          const nextIndex = currentIndex < pendingDrafts.length - 1 ? currentIndex + 1 : currentIndex - 1;
          if (nextIndex >= 0 && nextIndex < pendingDrafts.length) {
            setActiveDraftId(pendingDrafts[nextIndex].id);
          } else {
            setActiveDraftId(null);
          }
        }
      } else if (e.key === 'd' || e.key === 'D') {
        if (activeDraftId) {
          e.preventDefault();
          handleAction(activeDraftId, 'rejected');
          // Find next active item to auto-focus
          const nextIndex = currentIndex < pendingDrafts.length - 1 ? currentIndex + 1 : currentIndex - 1;
          if (nextIndex >= 0 && nextIndex < pendingDrafts.length) {
            setActiveDraftId(pendingDrafts[nextIndex].id);
          } else {
            setActiveDraftId(null);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [drafts, activeDraftId]);

  // Set initial active draft index
  useEffect(() => {
    const pending = drafts.filter(d => d.approval_status === 'draft');
    if (pending.length > 0) {
      if (!activeDraftId || !pending.find(d => d.id === activeDraftId)) {
        setActiveDraftId(pending[0].id);
      }
    } else {
      setActiveDraftId(null);
    }
  }, [drafts]);

  useEffect(() => {
    fetchUsers();
    fetchDrafts();
  }, []);

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    // 1. Calculate time ROI metrics and persist
    setHoursSaved(prev => {
      const increment = action === 'approved' ? 1.5 : 0.5;
      const newValue = prev + increment;
      localStorage.setItem('puna_hours_saved', newValue.toFixed(1));
      return newValue;
    });

    // 2. Update status in local React state so Kanban/Table views render columns accurately
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, approval_status: action } : d));

    // 3. Perform network call if not mock
    if (id.startsWith('mock-')) {
      return;
    }

    try {
      await fetch(`${BACKEND_URL}/api/v1/generate/assets/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      });
    } catch (err) {
      console.error('Error updating status on server:', err);
    }
  };

  // Re-draft handler to move item back to draft
  const handleResetToDraft = async (id: string) => {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, approval_status: 'draft' } : d));
    // Re-adjust metric down
    setHoursSaved(prev => {
      const currentAsset = drafts.find(d => d.id === id);
      const decrement = currentAsset?.approval_status === 'approved' ? 1.5 : 0.5;
      const newValue = Math.max(0, prev - decrement);
      localStorage.setItem('puna_hours_saved', newValue.toFixed(1));
      return newValue;
    });

    if (id.startsWith('mock-')) return;
    try {
      await fetch(`${BACKEND_URL}/api/v1/generate/assets/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      });
    } catch (err) {
      console.error('Error resetting status on server:', err);
    }
  };

  // Simulated LinkedIn Direct Publish (HITL Dispatch)
  const handleLinkedInPublish = (id: string) => {
    setConsoleLogs(prev => [...prev, '']);
    const publishLogs = [
      { text: '[INFO] Iniciando publicación directa en LinkedIn...', delay: 300 },
      { text: '[OK] Autenticando con LinkedIn Marketing API (OAuth2)...', delay: 1200 },
      { text: '[OK] Subiendo recurso visual a CDN de LinkedIn...', delay: 2500 },
      { text: `[SUCCESS] Publicado en LinkedIn. URN: urn:li:share:${Date.now()}`, delay: 4000 },
    ];
    publishLogs.forEach(step => {
      setTimeout(() => {
        setConsoleLogs(prev => [...prev, step.text]);
      }, step.delay);
    });
    setTimeout(() => {
      setPublishedIds(prev => new Set(prev).add(id));
    }, 4000);
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

  // Simulated Engine Console logs flow
  const runConsoleSimulations = () => {
    setConsoleLogs(['[INFO] Iniciando secuencia de generación autónoma...']);
    
    const logs = [
      { text: '[OK] Conectando con Puna Tech Engine...', delay: 500 },
      { text: '[OK] Inicializando cliente genai (Gemini API)...', delay: 1200 },
      { text: '[INFO] Agente Redactor: Formulando primer borrador con Gemini 2.5-flash...', delay: 2000 },
      { text: '[WARN] Gemini 2.5-flash latencia alta. Activando fallback...', delay: 3500 },
      { text: '[OK] Gemini 1.5-flash conectado (Fallback activo).', delay: 4500 },
      { text: '[OK] Agente Redactor: Borrador inicial generado con éxito.', delay: 5800 },
      { text: '[INFO] Agente Crítico: Auditando tono B2B y clichés corporativos...', delay: 6800 },
      { text: '[WARN] Crítico: Detectó cliché "en la era digital". Solicitando corrección...', delay: 8000 },
      { text: '[OK] Agente Crítico: Corrección aprobada. Contenido refinado listo.', delay: 9200 },
      { text: `[INFO] Conectando con Replicate API para renderizado (${imageModel.split('/')[1] || 'flux'})...`, delay: 10200 },
      { text: `[OK] ${imageModel.split('/')[1]?.toUpperCase() || 'FLUX'} renderizando imagen (1:1 WebP)...`, delay: 11500 },
      { text: '[SUCCESS] Borradores cargados y persistidos. Flujo multi-agente completado.', delay: 13000 }
    ];

    logs.forEach(step => {
      setTimeout(() => {
        setConsoleLogs(prev => [...prev, step.text]);
      }, step.delay);
    });
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTopic.trim() || formPlatforms.length === 0) return;

    setGenerating(true);
    setGenerationSuccess(null);
    setErrorMsg(null);

    // Trigger terminal simulator
    runConsoleSimulations();

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
      // Wait to append mock drafts to sync somewhat with the simulation timeline
      setTimeout(() => {
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
      }, 3000);
    } finally {
      // Maintain generating spinner slightly longer to let users read console output
      setTimeout(() => {
        setGenerating(false);
      }, 4000);
    }
  };

  return (
    <div className="min-h-screen bg-caoba-black text-crema font-sans selection:bg-terracota selection:text-crema relative overflow-hidden">
      
      {/* Decorative Grid Pattern (High Authority Terminal Look) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#6d2c2c0a_1px,transparent_1px),linear-gradient(to_bottom,#6d2c2c0a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-terracota/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-caoba/10 rounded-full blur-3xl pointer-events-none" />

      {/* Navigation Header */}
      <header className="border-b border-caoba-dark bg-caoba-black/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-sm bg-terracota flex items-center justify-center shadow-md">
              <span className="font-mono font-bold text-crema text-md">P</span>
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wider text-crema">
                PUNA TECH
              </h1>
              <p className="text-[9px] text-terracota font-mono tracking-wider">COGNITIVE CONTENT CORE</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-caoba-dark border border-caoba/40 px-3 py-1.5 rounded-sm">
              <span className="text-[10px] text-crema-muted font-mono uppercase tracking-wider">Profile:</span>
              <select
                value={activeUser?.id || ''}
                onChange={(e) => {
                  const u = users.find(usr => usr.id === e.target.value);
                  if (u) {
                    setActiveUser(u);
                    fetchTemplates(u.company_id);
                  }
                }}
                className="bg-transparent text-xs font-mono font-bold text-crema focus:outline-none cursor-pointer"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id} className="bg-caoba-dark text-crema">
                    {u.full_name || u.email}
                  </option>
                ))}
              </select>
              <button
                onClick={handleCreateUser}
                className="text-terracota hover:text-crema p-0.5 ml-1 transition-colors"
                title="Crear Nuevo Usuario"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            
            <div className="flex items-center space-x-2 font-mono text-[10px] text-crema-muted">
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-terracota opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-terracota"></span>
              </span>
              <span className="hidden sm:inline">HUMAN-IN-THE-LOOP ACTIVE</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Intro & Conversion Stats Row */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-6 border-b border-caoba-dark/60">
          <div>
            <h2 className="text-2xl font-bold tracking-wider text-crema mb-2 font-sans uppercase">
              Panel de Aprobación de Contenidos
            </h2>
            <p className="text-crema-muted text-xs max-w-xl">
              Revisa, modifica o aprueba las publicaciones autogeneradas por la IA de Puna Tech.
              Utiliza los atajos de teclado para operaciones masivas instantáneas.
            </p>
          </div>
          
          {/* Conversion Metric (GTM Time ROI) */}
          <div className="bg-caoba-dark/80 border border-caoba/40 rounded-sm p-4 min-w-[240px] flex items-center space-x-4 shadow-lg shadow-caoba-black/50">
            <div className="p-2.5 bg-terracota/10 border border-terracota/20 rounded-sm">
              <svg className="w-6 h-6 text-terracota" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-mono text-terracota tracking-widest leading-none mb-1">TIME SAVED ROI</p>
              <h4 className="text-xl font-bold font-mono text-crema leading-tight">
                {hoursSaved.toFixed(1)} hrs
              </h4>
              <p className="text-[9px] text-crema-muted leading-none mt-1">Horas ahorradas esta semana</p>
            </div>
          </div>
        </div>

        {/* Top Control Section: Generator Form & System Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          
          {/* Generation Request Form */}
          <div className="lg:col-span-2 bg-caoba-dark/30 border border-caoba/40 rounded-sm p-6 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-crema mb-4 flex items-center space-x-2 font-mono uppercase tracking-wider">
              <svg className="w-4 h-4 text-terracota" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Generar Publicación Manual</span>
            </h3>
            
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-bold text-crema-muted uppercase tracking-wider mb-2">
                  Tema o Contexto Operativo
                </label>
                <textarea
                  value={formTopic}
                  onChange={(e) => setFormTopic(e.target.value)}
                  placeholder="Ej. Integración de agentes IA para automatizar carga de facturas en ERP ahorrando 15 horas semanales"
                  className="w-full bg-caoba-black border border-caoba/40 rounded-sm px-4 py-3 text-xs text-crema placeholder-crema-muted/30 focus:outline-none focus:border-terracota transition-colors h-24 resize-none font-sans"
                  required
                />
              </div>

              <details className="group border border-caoba/40 rounded-sm bg-caoba-black/20">
                <summary className="list-none flex items-center justify-between p-4 cursor-pointer select-none text-[10px] font-mono font-bold uppercase tracking-wider text-crema-muted hover:text-crema">
                  <span>Ajustes de Branding y Diseño (Opcional)</span>
                  <svg className="w-4 h-4 transition-transform duration-250 group-open:rotate-180 text-crema-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="p-4 pt-0 border-t border-caoba/40 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="col-span-full mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-caoba/20 pb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-[9px] font-mono font-bold text-crema-muted uppercase tracking-wider">Cargar Plantilla:</span>
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => handleLoadTemplate(e.target.value)}
                        className="bg-caoba-black border border-caoba/40 text-[11px] font-mono rounded-sm px-2.5 py-1.5 text-crema focus:outline-none cursor-pointer"
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
                      className="text-[9px] font-mono bg-caoba-black hover:bg-caoba-dark border border-caoba/40 text-crema-muted hover:text-crema font-bold px-3 py-2 rounded-sm flex items-center space-x-1.5 transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2v-9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      <span>Guardar Ajustes como Plantilla</span>
                    </button>
                  </div>

                  <div className="mt-3">
                    <label className="block text-[9px] font-mono font-bold text-crema-muted uppercase tracking-wider mb-2">Paleta de Colores</label>
                    <input
                      type="text"
                      value={brandColors}
                      onChange={(e) => setBrandColors(e.target.value)}
                      placeholder="Ej. Terracota, crema y caoba oscuro"
                      className="w-full bg-caoba-black border border-caoba/40 rounded-sm px-3 py-2 text-xs text-crema placeholder-crema-muted/30 focus:outline-none focus:border-terracota transition-colors"
                    />
                  </div>
                  <div className="mt-3">
                    <label className="block text-[9px] font-mono font-bold text-crema-muted uppercase tracking-wider mb-2">Estilo de Imagen</label>
                    <input
                      type="text"
                      value={visualStyle}
                      onChange={(e) => setVisualStyle(e.target.value)}
                      placeholder="Ej. Renders 3D minimalistas, texturas mate"
                      className="w-full bg-caoba-black border border-caoba/40 rounded-sm px-3 py-2 text-xs text-crema placeholder-crema-muted/30 focus:outline-none focus:border-terracota transition-colors"
                    />
                  </div>
                  <div className="mt-3">
                    <label className="block text-[9px] font-mono font-bold text-crema-muted uppercase tracking-wider mb-2">Tono del Texto</label>
                    <input
                      type="text"
                      value={toneModifier}
                      onChange={(e) => setToneModifier(e.target.value)}
                      placeholder="Ej. Directo, analítico, persuasivo"
                      className="w-full bg-caoba-black border border-caoba/40 rounded-sm px-3 py-2 text-xs text-crema placeholder-crema-muted/30 focus:outline-none focus:border-terracota transition-colors"
                    />
                  </div>
                </div>
              </details>

              <div className="flex flex-col sm:flex-row gap-4 justify-between items-end sm:items-center pt-2">
                <div className="w-full sm:w-auto">
                  <label className="block text-[10px] font-mono font-bold text-crema-muted uppercase tracking-wider mb-2">
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
                            className={`px-3.5 py-1.5 rounded-sm text-[10px] font-mono font-bold uppercase transition-all duration-150 border ${
                              isSelected
                                ? 'bg-terracota border-terracota text-crema shadow-md'
                                : 'bg-caoba-black border-caoba/40 text-crema-muted hover:text-crema'
                            }`}
                          >
                            {plat}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center space-x-2 bg-caoba-black px-3 py-1.5 rounded-sm border border-caoba/40">
                      <span className="text-[9px] font-mono font-bold text-crema-muted uppercase tracking-wider">Formato:</span>
                      <select
                        value={visualFormat}
                        onChange={(e) => setVisualFormat(e.target.value as any)}
                        className="bg-transparent text-xs font-bold text-terracota focus:outline-none cursor-pointer"
                      >
                        <option value="single_image" className="bg-caoba-dark text-crema">Imagen Única</option>
                        <option value="carousel" className="bg-caoba-dark text-crema">Carrusel (Slides)</option>
                        <option value="text_only" className="bg-caoba-dark text-crema">Solo Texto</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={generating}
                  className="w-full sm:w-auto bg-terracota hover:bg-terracota-dark disabled:bg-caoba/40 text-crema font-bold px-6 py-2 rounded-sm transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg shadow-terracota/10 border border-terracota font-mono text-xs uppercase"
                >
                  {generating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-crema border-t-transparent rounded-full animate-spin" />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <span>Solicitar IA</span>
                    </>
                  )}
                </button>
              </div>

              {generationSuccess && (
                <div className="bg-emerald-950/30 border border-emerald-900/50 text-emerald-400 px-4 py-3 rounded-sm text-xs font-mono">
                  {generationSuccess}
                </div>
              )}
            </form>
          </div>

          {/* Infrastructure Connections & Simulated Console Logs */}
          <div className="flex flex-col space-y-4">
            {/* Infrastructure Details */}
            <div className="bg-caoba-dark/30 border border-caoba/40 rounded-sm p-4 backdrop-blur-sm">
              <h3 className="text-xs font-bold text-crema mb-3 flex items-center space-x-2 font-mono uppercase tracking-wider">
                <svg className="w-4 h-4 text-terracota" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2" />
                </svg>
                <span>Servicios Activos</span>
              </h3>
              
              <div className="space-y-1.5 font-mono text-[10px]">
                <div className="flex justify-between items-center py-1 border-b border-caoba/10">
                  <span className="text-crema-muted">Core Engine:</span>
                  <span className="text-emerald-400">FastAPI // Online</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-caoba/10">
                  <span className="text-crema-muted">Llama Modelo:</span>
                  <span className="text-terracota font-bold">Gemini 3.5 Flash</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-caoba/10">
                  <span className="text-crema-muted">Render Motor:</span>
                  <select
                    value={imageModel}
                    onChange={(e) => setImageModel(e.target.value)}
                    className="bg-caoba-black border border-caoba/30 text-[9px] font-bold text-terracota rounded-sm px-1 py-0.5 focus:outline-none cursor-pointer"
                  >
                    <option value="black-forest-labs/flux-2-pro" className="bg-caoba-dark text-crema">FLUX 2 Pro (Producción B2B)</option>
                    <option value="black-forest-labs/flux-schnell" className="bg-caoba-dark text-crema">FLUX Schnell (Preview Rápido)</option>
                    <option value="black-forest-labs/flux-2-max" className="bg-caoba-dark text-crema">FLUX 2 Max (Hero / Banners)</option>
                    <option value="recraft-ai/recraft-v3" className="bg-caoba-dark text-crema">Recraft V3 (Tipografía Editorial)</option>
                  </select>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-caoba/10">
                  <span className="text-crema-muted">Sugerencia:</span>
                  <span className="text-amber-400 text-[9px] italic">
                    {visualFormat === 'carousel' 
                      ? '💡 Recraft V3 para tipografía en carruseles' 
                      : visualFormat === 'text_only'
                        ? '💡 Sin imagen — formato solo texto'
                        : '💡 FLUX 2 Pro: mejor balance calidad/costo'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-crema-muted">Persistencia:</span>
                  <span className="text-sky-400">Supabase DB</span>
                </div>
              </div>
            </div>

            {/* Engine Console Visualizer */}
            <div className="bg-caoba-black border border-caoba/40 p-4 rounded-sm font-mono text-[10px] text-crema-muted h-[170px] overflow-y-auto flex flex-col space-y-1 flex-grow scrollbar-thin">
              <div className="text-terracota font-bold border-b border-caoba/20 pb-1.5 mb-1.5 flex justify-between items-center tracking-wider uppercase">
                <span>ENGINE CONSOLE LOGS</span>
                <span className="flex h-1.5 w-1.5 relative">
                  {generating ? (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-terracota opacity-75"></span>
                  ) : null}
                  <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${generating ? 'bg-terracota' : 'bg-caoba'}`}></span>
                </span>
              </div>
              
              {consoleLogs.length === 0 ? (
                <div className="text-crema-muted/30 italic text-[9px] my-auto text-center">
                  Consola lista. Esperando comando de generación...
                </div>
              ) : (
                consoleLogs.map((log, idx) => {
                  let logColor = 'text-crema-muted';
                  if (log.includes('[OK]') || log.includes('[SUCCESS]')) logColor = 'text-emerald-400';
                  else if (log.includes('[WARN]')) logColor = 'text-amber-500 font-bold';
                  else if (log.includes('[INFO]')) logColor = 'text-sky-400';
                  
                  return (
                    <div key={idx} className={`${logColor} leading-relaxed`}>
                      {log}
                    </div>
                  );
                })
              )}
              {generating && (
                <div className="text-terracota animate-pulse font-bold">_</div>
              )}
              <div ref={consoleBottomRef} />
            </div>
          </div>
        </div>

        {/* View Switcher Header Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="text-md font-bold text-crema flex items-center space-x-2 font-mono uppercase tracking-wider">
            <svg className="w-4 h-4 text-crema-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2" />
            </svg>
            <span>Cola de Contenidos ({drafts.filter(d => d.approval_status === 'draft').length} pendientes)</span>
          </h3>

          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
            {/* Help guidelines for Keyboard nav */}
            <div className="hidden lg:flex items-center space-x-3 text-[10px] font-mono text-crema-muted/60 bg-caoba-dark/20 border border-caoba/20 px-3 py-1.5 rounded-sm">
              <span>ATAJOS:</span>
              <span><kbd className="px-1.5 py-0.5 bg-caoba-dark border border-caoba/40 text-crema rounded-sm">▲/▼/◀/▶</kbd> Navegar</span>
              <span><kbd className="px-1.5 py-0.5 bg-caoba-dark border border-caoba/40 text-emerald-400 rounded-sm">A</kbd> Aprobar</span>
              <span><kbd className="px-1.5 py-0.5 bg-caoba-dark border border-caoba/40 text-red-400 rounded-sm">D</kbd> Descartar</span>
            </div>

            {/* Segmented button group (Tabs) */}
            <div className="flex border border-caoba/40 rounded-sm bg-caoba-black p-0.5 font-mono text-[10px] w-full sm:w-auto">
              <button
                onClick={() => setCurrentView('cards')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 font-bold tracking-wider transition-colors rounded-sm cursor-pointer ${currentView === 'cards' ? 'bg-terracota text-crema' : 'text-crema-muted hover:text-crema'}`}
              >
                TARJETAS
              </button>
              <button
                onClick={() => setCurrentView('kanban')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 font-bold tracking-wider transition-colors rounded-sm cursor-pointer ${currentView === 'kanban' ? 'bg-terracota text-crema' : 'text-crema-muted hover:text-crema'}`}
              >
                KANBAN
              </button>
              <button
                onClick={() => setCurrentView('table')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 font-bold tracking-wider transition-colors rounded-sm cursor-pointer ${currentView === 'table' ? 'bg-terracota text-crema' : 'text-crema-muted hover:text-crema'}`}
              >
                TABLA DENSA
              </button>
            </div>

            <button 
              onClick={fetchDrafts}
              className="px-3 py-1.5 text-[10px] font-mono bg-caoba-dark hover:bg-caoba border border-caoba/40 text-crema-muted hover:text-crema rounded-sm transition-all"
            >
              Recargar Cola
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-10 h-10 border-2 border-terracota border-t-transparent rounded-full animate-spin" />
            <p className="text-crema-muted text-xs font-mono">Consolidando registros de cola...</p>
          </div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-caoba/40 rounded-sm">
            <svg className="w-10 h-10 text-caoba mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-crema font-bold text-sm uppercase font-mono tracking-wider">Cola de borradores vacía</p>
            <p className="text-crema-muted text-xs mt-1">Utiliza el formulario superior para generar nuevas propuestas.</p>
          </div>
        ) : (
          <div>
            {/* ----------------- VIEW 1: CLASSIC CARDS ----------------- */}
            {currentView === 'cards' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {drafts
                  .filter(draft => draft.approval_status === 'draft')
                  .map((draft) => {
                    const isActive = draft.id === activeDraftId;
                    return (
                      <div 
                        key={draft.id} 
                        onClick={() => setActiveDraftId(draft.id)}
                        className={`border transition-all duration-200 rounded-sm overflow-hidden flex flex-col justify-between group shadow-md cursor-pointer relative ${
                          isActive 
                            ? 'border-terracota ring-2 ring-terracota/40 bg-caoba-dark/50 shadow-terracota/5' 
                            : 'border-caoba/30 bg-caoba-dark/25 hover:border-caoba/60'
                        }`}
                      >
                        {/* Keyboard navigation active indicator */}
                        {isActive && (
                          <div className="absolute top-0 left-0 right-0 h-0.5 bg-terracota" />
                        )}

                        {/* Platform Header */}
                        <div className="px-4 py-3 bg-caoba-black/80 flex items-center justify-between border-b border-caoba/30 font-mono text-[9px]">
                          <div className="flex items-center space-x-2">
                            {draft.platform_name === 'linkedin' && (
                              <span className="px-2.5 py-0.5 rounded-sm font-bold uppercase bg-sky-950/80 text-sky-400 border border-sky-900/50">
                                LINKEDIN
                              </span>
                            )}
                            {draft.platform_name === 'x' && (
                              <span className="px-2.5 py-0.5 rounded-sm font-bold uppercase bg-zinc-900 text-zinc-300 border border-zinc-800">
                                X / TWITTER
                              </span>
                            )}
                            {draft.platform_name === 'instagram' && (
                              <span className="px-2.5 py-0.5 rounded-sm font-bold uppercase bg-pink-950/80 text-pink-400 border border-pink-900/50">
                                INSTAGRAM
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {isActive && (
                              <span className="text-terracota font-bold animate-pulse text-[8px] tracking-wider bg-terracota/10 px-1 border border-terracota/30 rounded-sm">
                                FOCUS ACTIVE [A/D]
                              </span>
                            )}
                            <span className="text-crema-muted/60">
                              {new Date(draft.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        {/* Text & Image Preview */}
                        <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                          <div>
                            <p className="text-xs leading-relaxed text-crema whitespace-pre-wrap font-sans">
                              {draft.generated_text}
                            </p>
                          </div>

                          {draft.media_url && (
                            <div className="flex flex-col space-y-2">
                              {renderMediaPreview(draft.media_url)}
                            </div>
                          )}
                        </div>

                        {/* Action buttons footer */}
                        <div className="p-4 bg-caoba-black/30 border-t border-caoba/20 flex gap-3 font-mono text-[10px]">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCopy(draft.generated_text, e); }}
                            className="px-2.5 py-2 border border-caoba/40 hover:border-caoba/80 rounded-sm text-crema-muted hover:text-crema bg-caoba-black/20 transition-all flex items-center space-x-1 cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <span>TEXT</span>
                          </button>
                          
                          <div className="flex-1 flex gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAction(draft.id, 'rejected'); }}
                              className="flex-1 bg-caoba-black hover:bg-red-950/20 border border-caoba/40 hover:border-red-900/30 text-crema-muted hover:text-red-400 py-2 rounded-sm font-bold transition-colors cursor-pointer text-center"
                            >
                              DISCARD
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAction(draft.id, 'approved'); }}
                              className="flex-1 bg-terracota hover:bg-terracota-dark text-crema py-2 rounded-sm border border-terracota hover:border-terracota-dark font-bold transition-all shadow-md shadow-terracota/5 cursor-pointer text-center"
                            >
                              APPROVE
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* ----------------- VIEW 2: KANBAN BOARD ----------------- */}
            {currentView === 'kanban' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start font-sans">
                
                {/* Column 1: Borradores (Pending) */}
                <div className="bg-caoba-black/40 border border-caoba/30 rounded-sm p-4">
                  <div className="flex items-center justify-between border-b border-caoba/30 pb-3 mb-4 font-mono">
                    <span className="text-xs font-bold text-crema tracking-wider">1. PENDIENTES</span>
                    <span className="px-2 py-0.5 rounded-sm bg-caoba text-crema text-[10px] font-bold">
                      {drafts.filter(d => d.approval_status === 'draft').length}
                    </span>
                  </div>
                  
                  <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin">
                    {drafts.filter(d => d.approval_status === 'draft').map(draft => {
                      const isActive = draft.id === activeDraftId;
                      return (
                        <div
                          key={draft.id}
                          onClick={() => setActiveDraftId(draft.id)}
                          className={`p-3 border rounded-sm transition-all relative cursor-pointer ${
                            isActive 
                              ? 'border-terracota bg-caoba-dark/50 ring-1 ring-terracota/30' 
                              : 'border-caoba/20 bg-caoba-dark/15 hover:border-caoba/40'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2 text-[9px] font-mono">
                            <span className={`font-bold tracking-wider uppercase ${
                              draft.platform_name === 'linkedin' ? 'text-sky-400' : draft.platform_name === 'x' ? 'text-zinc-300' : 'text-pink-400'
                            }`}>
                              {draft.platform_name}
                            </span>
                            {isActive && <span className="text-terracota font-bold animate-pulse">[FOCUS]</span>}
                          </div>
                          
                          <p className="text-[11px] leading-relaxed text-crema-muted line-clamp-3 mb-3">
                            {draft.generated_text}
                          </p>
                          
                          {renderMediaPreview(draft.media_url)}
                          
                          <div className="flex gap-2 font-mono text-[9px]">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAction(draft.id, 'rejected'); }}
                              className="flex-1 py-1 px-2 bg-caoba-black border border-caoba/30 hover:border-red-900/40 text-crema-muted hover:text-red-400 rounded-sm cursor-pointer text-center"
                            >
                              DISCARD
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAction(draft.id, 'approved'); }}
                              className="flex-1 py-1 px-2 bg-terracota border border-terracota hover:bg-terracota-dark text-crema rounded-sm cursor-pointer text-center font-bold"
                            >
                              APPROVE
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Column 2: Aprobados (Approved) */}
                <div className="bg-caoba-black/40 border border-caoba/30 rounded-sm p-4">
                  <div className="flex items-center justify-between border-b border-caoba/30 pb-3 mb-4 font-mono">
                    <span className="text-xs font-bold text-emerald-400 tracking-wider">2. APROBADOS</span>
                    <span className="px-2 py-0.5 rounded-sm bg-emerald-950/60 border border-emerald-900/50 text-emerald-400 text-[10px] font-bold">
                      {drafts.filter(d => d.approval_status === 'approved').length}
                    </span>
                  </div>

                  <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin">
                    {drafts.filter(d => d.approval_status === 'approved').length === 0 ? (
                      <div className="text-[10px] text-crema-muted/30 italic text-center py-10 font-mono">
                        Ningún contenido aprobado aún.
                      </div>
                    ) : (
                      drafts.filter(d => d.approval_status === 'approved').map(draft => (
                        <div key={draft.id} className="p-3 border border-emerald-900/20 bg-emerald-950/5 rounded-sm group relative">
                          <div className="flex items-center justify-between mb-2 text-[9px] font-mono">
                            <span className="font-bold text-sky-400 uppercase">{draft.platform_name}</span>
                            {publishedIds.has(draft.id) 
                              ? <span className="text-sky-400 text-[8px] border border-sky-800/50 px-1 bg-sky-950/30 rounded-sm font-bold">PUBLICADO</span>
                              : <span className="text-emerald-400 text-[8px] border border-emerald-900/50 px-1 bg-emerald-950/20 rounded-sm">APROBADO</span>
                            }
                          </div>
                          
                          <p className="text-[11px] leading-relaxed text-crema-muted line-clamp-3 mb-3">
                            {draft.generated_text}
                          </p>
                          
                          <div className="flex gap-2 font-mono text-[9px]">
                            <button
                              onClick={() => handleResetToDraft(draft.id)}
                              className="flex-1 py-1.5 border border-caoba/30 hover:border-caoba hover:bg-caoba-dark/50 text-crema-muted hover:text-crema rounded-sm transition-colors cursor-pointer text-center"
                            >
                              REGRESAR
                            </button>
                            <button
                              onClick={() => handleLinkedInPublish(draft.id)}
                              className="flex-1 py-1.5 bg-sky-900/30 border border-sky-800/40 hover:bg-sky-900/50 text-sky-400 rounded-sm transition-colors cursor-pointer text-center font-bold"
                            >
                              PUBLICAR LI
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Column 3: Descartados (Rejected) */}
                <div className="bg-caoba-black/40 border border-caoba/30 rounded-sm p-4">
                  <div className="flex items-center justify-between border-b border-caoba/30 pb-3 mb-4 font-mono">
                    <span className="text-xs font-bold text-red-400 tracking-wider">3. DESCARTADOS</span>
                    <span className="px-2 py-0.5 rounded-sm bg-red-950/60 border border-red-900/50 text-red-400 text-[10px] font-bold">
                      {drafts.filter(d => d.approval_status === 'rejected').length}
                    </span>
                  </div>

                  <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin">
                    {drafts.filter(d => d.approval_status === 'rejected').length === 0 ? (
                      <div className="text-[10px] text-crema-muted/30 italic text-center py-10 font-mono">
                        Ningún contenido descartado.
                      </div>
                    ) : (
                      drafts.filter(d => d.approval_status === 'rejected').map(draft => (
                        <div key={draft.id} className="p-3 border border-red-900/25 bg-red-950/5 rounded-sm relative">
                          <div className="flex items-center justify-between mb-2 text-[9px] font-mono">
                            <span className="font-bold text-crema-muted/70 uppercase">{draft.platform_name}</span>
                            <span className="text-red-400 text-[8px] border border-red-900/50 px-1 bg-red-950/20 rounded-sm">DESCARTADO</span>
                          </div>
                          
                          <p className="text-[11px] leading-relaxed text-crema-muted line-clamp-3 mb-3">
                            {draft.generated_text}
                          </p>

                          <div className="flex gap-2 font-mono text-[9px]">
                            <button
                              onClick={() => handleResetToDraft(draft.id)}
                              className="flex-1 py-1.5 border border-caoba/30 hover:border-caoba hover:bg-caoba-dark/50 text-crema-muted hover:text-crema rounded-sm transition-colors cursor-pointer text-center"
                            >
                              REGRESAR A BORRADORES
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* ----------------- VIEW 3: DENSE DATA TABLE ----------------- */}
            {currentView === 'table' && (
              <div className="bg-caoba-dark/20 border border-caoba/30 rounded-sm overflow-hidden font-mono text-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-caoba-black border-b border-caoba/30 text-[10px] tracking-wider text-crema-muted">
                        <th className="py-3 px-4 font-bold uppercase">Estado</th>
                        <th className="py-3 px-4 font-bold uppercase">Canal</th>
                        <th className="py-3 px-4 font-bold uppercase">Texto del Post</th>
                        <th className="py-3 px-4 font-bold uppercase">Recurso Visual</th>
                        <th className="py-3 px-4 font-bold uppercase">Fecha de Carga</th>
                        <th className="py-3 px-4 font-bold uppercase text-right">Acción Operativa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-caoba/10">
                      {drafts.map((draft) => {
                        const isPending = draft.approval_status === 'draft';
                        const isActive = draft.id === activeDraftId && isPending;
                        
                        return (
                          <tr 
                            key={draft.id} 
                            onClick={() => isPending && setActiveDraftId(draft.id)}
                            className={`transition-colors cursor-pointer ${
                              isActive 
                                ? 'bg-caoba-dark/60 text-crema border-l-2 border-l-terracota' 
                                : isPending 
                                  ? 'hover:bg-caoba-dark/15 text-crema-muted' 
                                  : 'opacity-55 hover:opacity-100 text-crema-muted'
                            }`}
                          >
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {draft.approval_status === 'draft' && (
                                <span className="px-2 py-0.5 rounded-sm bg-caoba text-crema text-[9px] font-bold border border-caoba/60">
                                  DRAFT
                                </span>
                              )}
                              {draft.approval_status === 'approved' && (
                                <span className="px-2 py-0.5 rounded-sm bg-emerald-950 text-emerald-400 text-[9px] font-bold border border-emerald-900/50">
                                  APPROVED
                                </span>
                              )}
                              {draft.approval_status === 'rejected' && (
                                <span className="px-2 py-0.5 rounded-sm bg-red-950 text-red-400 text-[9px] font-bold border border-red-900/50">
                                  REJECTED
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-bold uppercase whitespace-nowrap">
                              {draft.platform_name}
                            </td>
                            <td className="py-3.5 px-4 max-w-sm truncate font-sans text-[11px]">
                              {draft.generated_text}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {draft.media_url ? (
                                (() => {
                                  const isCarousel = draft.media_url.trim().startsWith('[');
                                  let linkUrl = draft.media_url;
                                  let label = "VER IMAGEN";
                                  if (isCarousel) {
                                    try {
                                      const urls = JSON.parse(draft.media_url);
                                      linkUrl = urls[0] || "";
                                      label = `VER IMÁGENES (${urls.length})`;
                                    } catch (e) {}
                                  }
                                  return (
                                    <a 
                                      href={linkUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="text-terracota hover:underline flex items-center space-x-1"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      <span className="text-[10px]">{label}</span>
                                    </a>
                                  );
                                })()
                              ) : (
                                <span className="text-crema-muted/30">TEXT ONLY</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-crema-muted/60 whitespace-nowrap text-[10px]">
                              {new Date(draft.created_at).toLocaleDateString()} {new Date(draft.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              {draft.approval_status === 'draft' ? (
                                <div className="flex justify-end space-x-2">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleAction(draft.id, 'rejected'); }}
                                    className="px-2.5 py-1 bg-caoba-black border border-caoba/40 hover:border-red-900/40 text-crema-muted hover:text-red-400 rounded-sm cursor-pointer font-bold text-[10px] text-center"
                                  >
                                    DISCARD
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleAction(draft.id, 'approved'); }}
                                    className="px-2.5 py-1 bg-terracota hover:bg-terracota-dark text-crema rounded-sm border border-terracota font-bold text-[10px] cursor-pointer text-center"
                                  >
                                    APPROVE
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleResetToDraft(draft.id); }}
                                  className="px-2.5 py-1 bg-caoba-black hover:bg-caoba-dark border border-caoba/40 text-crema-muted hover:text-crema rounded-sm cursor-pointer text-[10px]"
                                >
                                  RESET TO DRAFT
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
        {/* ─── EDITORIAL CALENDAR (30 Days) ─── */}
        <div className="mt-16 border-t border-caoba-dark/60 pt-10">
          <details className="group">
            <summary className="list-none flex items-center justify-between cursor-pointer select-none mb-6">
              <h3 className="text-md font-bold text-crema flex items-center space-x-3 font-mono uppercase tracking-wider">
                <svg className="w-5 h-5 text-terracota" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Calendario Editorial Estratégico (30 Días)</span>
              </h3>
              <svg className="w-5 h-5 transition-transform duration-250 group-open:rotate-180 text-crema-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>

            <div className="space-y-8">
              {([1, 2, 3, 4] as const).map(phase => {
                const phaseEntries = EDITORIAL_CALENDAR.filter(e => e.phase === phase);
                const phaseNames: Record<number, string> = { 1: 'Fase 1: Educación y Problematización', 2: 'Fase 2: Casos de Uso y Aplicación', 3: 'Fase 3: Arquitectura Técnica y Diferenciación', 4: 'Fase 4: Conversión y Acción Directa' };
                const phaseColors: Record<number, string> = { 1: 'border-sky-800/40', 2: 'border-amber-800/40', 3: 'border-purple-800/40', 4: 'border-terracota/60' };
                const phaseBadgeColors: Record<number, string> = { 1: 'bg-sky-950/40 text-sky-400 border-sky-800/50', 2: 'bg-amber-950/40 text-amber-400 border-amber-800/50', 3: 'bg-purple-950/40 text-purple-400 border-purple-800/50', 4: 'bg-terracota/20 text-terracota border-terracota/40' };

                return (
                  <div key={phase} className={`border-l-2 ${phaseColors[phase]} pl-6`}>
                    <div className="flex items-center space-x-3 mb-4">
                      <span className={`px-2.5 py-1 rounded-sm text-[10px] font-mono font-bold uppercase border ${phaseBadgeColors[phase]}`}>
                        {phaseNames[phase]}
                      </span>
                      <span className="text-[10px] text-crema-muted font-mono">
                        Días {phaseEntries[0]?.day}–{phaseEntries[phaseEntries.length - 1]?.day}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {phaseEntries.map(entry => (
                        <div
                          key={entry.day}
                          className="bg-caoba-dark/25 border border-caoba/25 rounded-sm p-3 hover:border-caoba/50 transition-all group/cal"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono font-bold text-terracota">
                              DÍA {String(entry.day).padStart(2, '0')}
                            </span>
                            <div className="flex items-center space-x-1">
                              {entry.platforms.map(p => (
                                <span key={p} className={`text-[8px] font-mono font-bold px-1 py-0.5 rounded-sm border ${
                                  p === 'linkedin' ? 'text-sky-400 border-sky-900/40 bg-sky-950/30' :
                                  p === 'x' ? 'text-zinc-400 border-zinc-700/40 bg-zinc-900/30' :
                                  'text-pink-400 border-pink-900/40 bg-pink-950/30'
                                }`}>
                                  {p.toUpperCase()}
                                </span>
                              ))}
                            </div>
                          </div>
                          <p className="text-[11px] text-crema leading-relaxed line-clamp-2 mb-2 font-sans">
                            {entry.topic}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-sm border ${
                              entry.format === 'carousel' ? 'text-amber-400 border-amber-900/30 bg-amber-950/20' :
                              entry.format === 'single_image' ? 'text-emerald-400 border-emerald-900/30 bg-emerald-950/20' :
                              'text-crema-muted border-caoba/30 bg-caoba-dark/30'
                            }`}>
                              {entry.format === 'carousel' ? 'CARRUSEL' : entry.format === 'single_image' ? 'IMAGEN' : 'TEXTO'}
                            </span>
                            <button
                              onClick={() => {
                                setFormTopic(entry.topic);
                                setFormPlatforms(entry.platforms);
                                setVisualFormat(entry.format);
                                if (entry.fluxPrompt) {
                                  setVisualStyle(entry.fluxPrompt);
                                }
                                if (entry.format === 'carousel') {
                                  setImageModel('recraft-ai/recraft-v3');
                                } else if (entry.format === 'single_image') {
                                  setImageModel('black-forest-labs/flux-2-pro');
                                }
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="text-[9px] font-mono font-bold text-terracota hover:text-crema bg-terracota/10 hover:bg-terracota/20 border border-terracota/30 px-2 py-1 rounded-sm transition-all opacity-70 group-hover/cal:opacity-100 cursor-pointer"
                            >
                              ⚡ CARGAR
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        </div>
      </main>
      
      <footer className="border-t border-caoba-dark/60 bg-caoba-black/40 mt-20 py-8 text-center text-[10px] text-crema-muted/40 font-mono">
        <p>© 2026 PUNA TECH. TODOS LOS DERECHOS RESERVADOS. PROCESAMIENTO AUTÓNOMO DE ALTA AUTORIDAD.</p>
      </footer>
    </div>
  );
}
