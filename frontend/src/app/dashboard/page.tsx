'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── INTERFACES ──────────────────────────────────────────────────────────────

interface GeneratedAsset {
  id: string;
  company_id: string;
  platform_name: 'linkedin' | 'x' | 'instagram';
  generated_text: string;
  media_url?: string;
  approval_status: 'draft' | 'approved' | 'rejected';
  created_at: string;
  content_type?: ContentTypeName;
  is_local?: boolean; // True when asset couldn't be persisted to DB
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

interface CalendarEntry {
  day: number;
  phase: 1 | 2 | 3 | 4;
  phaseName: string;
  topic: string;
  format: 'carousel' | 'single_image' | 'text_only';
  platforms: ('linkedin' | 'x' | 'instagram')[];
  fluxPrompt: string | null;
  content_type: ContentTypeName;
}

type ContentTypeName = 'ROI' | 'TÉCNICO' | 'BUILD IN PUBLIC' | 'THOUGHT LEADERSHIP' | 'CTA' | 'COMUNIDAD';
type AppSection = 'calendar' | 'readyToPost' | 'ganchos' | 'inspiraciones' | 'categorias' | 'brandLibrary' | 'imageTemplates';
type PlatformTab = 'instagram' | 'x' | 'linkedin' | 'copy';

// ─── CONTENT TYPE CONFIG ─────────────────────────────────────────────────────

const CONTENT_TYPE_CONFIG: Record<ContentTypeName, { color: string; bg: string; border: string; dot: string }> = {
  'ROI':              { color: 'text-amber-400',   bg: 'bg-amber-950/40',   border: 'border-amber-800/50',   dot: 'bg-amber-400' },
  'TÉCNICO':          { color: 'text-sky-400',      bg: 'bg-sky-950/40',     border: 'border-sky-800/50',     dot: 'bg-sky-400' },
  'BUILD IN PUBLIC':  { color: 'text-emerald-400',  bg: 'bg-emerald-950/40', border: 'border-emerald-800/50', dot: 'bg-emerald-400' },
  'THOUGHT LEADERSHIP':{ color: 'text-purple-400',  bg: 'bg-purple-950/40',  border: 'border-purple-800/50',  dot: 'bg-purple-400' },
  'CTA':              { color: 'text-terracota',    bg: 'bg-terracota/10',   border: 'border-terracota/40',   dot: 'bg-terracota' },
  'COMUNIDAD':        { color: 'text-pink-400',     bg: 'bg-pink-950/40',    border: 'border-pink-800/50',    dot: 'bg-pink-400' },
};

function getContentType(draft: GeneratedAsset): ContentTypeName {
  if (draft.content_type) return draft.content_type;
  const text = draft.generated_text.toLowerCase();
  if (text.includes('roi') || text.includes('horas') || text.includes('ahorro') || text.includes('%')) return 'ROI';
  if (text.includes('agenda') || text.includes('consultá') || text.includes('hablemos') || text.includes('demo')) return 'CTA';
  if (text.includes('aprendimos') || text.includes('probamos') || text.includes('fallamos') || text.includes('construyendo')) return 'BUILD IN PUBLIC';
  if (text.includes('futuro') || text.includes('reflexión') || text.includes('industria') || text.includes('transformación')) return 'THOUGHT LEADERSHIP';
  if (text.includes('agente') || text.includes('arquitectura') || text.includes('api') || text.includes('stack')) return 'TÉCNICO';
  return 'TÉCNICO';
}

function formatSidebarDate(dateStr: string) {
  const d = new Date(dateStr);
  const monthNames = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  const dayNames = ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];
  return {
    month: monthNames[d.getMonth()],
    day: d.getDate(),
    weekday: dayNames[d.getDay()],
  };
}

// ─── MOCK DATA ───────────────────────────────────────────────────────────────

const MOCK_USERS: UserProfile[] = [{
  id: '00000000-0000-0000-0000-000000000000',
  company_id: '00000000-0000-0000-0000-000000000000',
  email: 'contacto@puna-tech.com',
  full_name: 'Martín (Puna Tech)',
  created_at: new Date().toISOString(),
}];

const MOCK_TEMPLATES: PreferenceTemplate[] = [
  {
    id: 'temp-puna-1',
    company_id: '00000000-0000-0000-0000-000000000000',
    name: 'Puna Tech — Carrusel Blueprint',
    brand_colors: 'Dark carbon gray (#1a1a2e), neon cyan accent (#00d4ff), electric blue (#0066ff)',
    visual_style_guidelines: 'Blueprint grid pattern at 15% opacity on dark background, glassmorphism cards, Geist Sans primary typography, Fira Code for metrics, dark mode precision aesthetic',
    tone_modifier: 'Institucional: objetivo, asertivo, denso en datos, enfocado en ROI medible',
    platforms: ['linkedin', 'instagram'],
    skip_image: false,
    visual_format: 'carousel',
    image_model: 'black-forest-labs/flux-schnell',
    created_at: new Date().toISOString(),
  },
  {
    id: 'temp-puna-2',
    company_id: '00000000-0000-0000-0000-000000000000',
    name: 'Puna Tech — Imagen Técnica',
    brand_colors: 'Carbon dark (#111218), neon cyan (#00d4ff), purple accent (#7c3aed)',
    visual_style_guidelines: 'Agent flow diagram, dark mode, Geist Mono for code labels, no stock photos, UI demos or architecture diagrams only',
    tone_modifier: 'Analítico, persuasivo y enfocado en cuellos de botella del back-office',
    platforms: ['linkedin', 'x'],
    skip_image: false,
    visual_format: 'single_image',
    image_model: 'black-forest-labs/flux-schnell',
    created_at: new Date().toISOString(),
  },
  {
    id: 'temp-puna-3',
    company_id: '00000000-0000-0000-0000-000000000000',
    name: 'Puna Tech — Thought Leadership',
    brand_colors: 'Dark mode carbon',
    visual_style_guidelines: 'Texto limpio, sin imágenes generadas',
    tone_modifier: 'Voz de fundadores: conversacional, reflectivo, build in public, primera persona',
    platforms: ['linkedin', 'x'],
    skip_image: true,
    visual_format: 'text_only',
    image_model: 'black-forest-labs/flux-schnell',
    created_at: new Date().toISOString(),
  },
];

const now = new Date();
const MOCK_DRAFTS: GeneratedAsset[] = [
  {
    id: 'mock-1',
    company_id: 'puna-tech-uuid',
    platform_name: 'linkedin',
    generated_text: '83% de reducción en tiempo de procesamiento.\n\nNo es una proyección. Es lo que midió uno de nuestros clientes después de implementar un agente de conciliación financiera en su ERP.\n\n3 semanas de integración. ROI positivo en el mes 2.\n\nSi tu equipo de FinOps todavía procesa facturas manualmente, calculá cuántas horas pierde por semana y multiplicá por 52.\n\nAhí está el costo real de no automatizar.\n\n→ puna-tech.com/auditoria',
    media_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop',
    approval_status: 'draft',
    created_at: new Date(now.getTime() - 2 * 3600000).toISOString(),
    content_type: 'ROI',
  },
  {
    id: 'mock-2',
    company_id: 'puna-tech-uuid',
    platform_name: 'x',
    generated_text: 'La orquestación multi-agente no es magia.\n\nEs diseño de sistemas.\n\n1/ Cada agente tiene un rol específico: no hace todo, hace una cosa bien.\n2/ La memoria compartida es el pegamento: sin contexto persistente, los agentes son ciegos entre sí.\n3/ El mecanismo de fallback define la resiliencia: ¿qué pasa si un nodo falla?\n\nLo que separa un prototipo de un sistema de producción es exactamente esto.\n\n4/ Fin.',
    media_url: undefined,
    approval_status: 'draft',
    created_at: new Date(now.getTime() - 5 * 3600000).toISOString(),
    content_type: 'TÉCNICO',
  },
  {
    id: 'mock-3',
    company_id: 'puna-tech-uuid',
    platform_name: 'instagram',
    generated_text: 'Slide 1: El agente de IA que construimos para automatizar el onboarding de clientes B2B.\n\nSlide 2: Semana 1 — el primer intento fallido. El agente perdía contexto entre pasos.\n\nSlide 3: Semana 2 — implementamos memoria vectorial. Todo cambió.\n\nSlide 4: Resultado: onboarding de 3 semanas → 4 días. Sin intervención humana en el 80% del flujo.\n\nSlide 5: Lo que aprendimos: la memoria es más importante que el modelo.',
    media_url: JSON.stringify([
      'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1516116216624-53e697fedbea?q=80&w=600&auto=format&fit=crop',
    ]),
    approval_status: 'draft',
    created_at: new Date(now.getTime() - 24 * 3600000).toISOString(),
    content_type: 'BUILD IN PUBLIC',
  },
  {
    id: 'mock-4',
    company_id: 'puna-tech-uuid',
    platform_name: 'linkedin',
    generated_text: 'No-code no escala. Lo aprendimos de nuestros clientes.\n\nCada startup que llega a Puna Tech después de 18 meses con Zapier o Make tiene el mismo problema: funciona hasta que no funciona, y cuando falla, no hay forma de debuggearlo en producción.\n\nLa promesa del no-code es "construí sin código". La realidad es "construí hasta que crezcás, después empezá de cero".\n\nLos sistemas agénticos reales necesitan lógica de negocio real. Y eso requiere ingeniería real.',
    media_url: undefined,
    approval_status: 'approved',
    created_at: new Date(now.getTime() - 48 * 3600000).toISOString(),
    content_type: 'THOUGHT LEADERSHIP',
  },
  {
    id: 'mock-5',
    company_id: 'puna-tech-uuid',
    platform_name: 'linkedin',
    generated_text: 'Si tu equipo de operaciones dedica más de 5 horas semanales a tareas repetitivas, tenemos que hablar.\n\nEn Puna Tech hacemos auditorías técnicas de flujos de trabajo para identificar exactamente qué procesos son automatizables, cuánto tiempo recuperarías y cuánto cuesta implementarlo.\n\nSin compromiso. Sin powerpoints genéricos.\n\n→ Agendá tu sesión en puna-tech.com',
    media_url: undefined,
    approval_status: 'rejected',
    created_at: new Date(now.getTime() - 72 * 3600000).toISOString(),
    content_type: 'CTA',
  },
];

// ─── HOOKS DATA ───────────────────────────────────────────────────────────────

const HOOKS_DATA = [
  {
    id: 'curiosity-es',
    category: 'Curiosidad / Intriga',
    lang: 'ES',
    count: 5,
    hooks: [
      'La mayoría de los equipos de operaciones no saben cuántas horas pierden por semana.',
      'Nadie te dice esto cuando comprás software de gestión.',
      'El cuello de botella de tu empresa no está donde creés.',
      'Probamos automatizar esto y los resultados nos sorprendieron.',
      'Hay una diferencia entre automatizar tareas y automatizar decisiones.',
    ],
  },
  {
    id: 'mindset-es',
    category: 'Recordatorio / Mindset',
    lang: 'ES',
    count: 5,
    hooks: [
      'Tu equipo de ventas no debería estar cargando datos.',
      'Un proceso manual que se repite es un proceso que debería ser automático.',
      'El software que usás hoy define el techo de crecimiento de mañana.',
      'Cada hora de tu equipo en tareas repetitivas es ROI negativo.',
      'La IA no reemplaza al estratega. Reemplaza al que hace las planillas.',
    ],
  },
  {
    id: 'truth-es',
    category: 'Verdad / Contrariana',
    lang: 'ES',
    count: 5,
    hooks: [
      'No necesitás más software. Necesitás menos procesos manuales.',
      'El no-code no escala. Lo aprendimos de nuestros clientes.',
      'Contratar más gente para crecer no es escalabilidad. Es dilución.',
      'La mayoría de los problemas de datos en B2B son problemas de proceso.',
      'Un agente trabajando 24/7 cuesta menos que una hora de reunión de equipo.',
    ],
  },
  {
    id: 'authority-es',
    category: 'Autoridad Técnica',
    lang: 'ES',
    count: 5,
    hooks: [
      'Tres capas que separan una automatización simple de un sistema agéntico real.',
      'Así orquestamos múltiples agentes de IA sin que colisionen entre sí.',
      'Por qué el no-code falla exactamente cuando más lo necesitás.',
      'La diferencia entre automatizar un paso y automatizar un flujo completo.',
      'Lo que ningún vendor de IA te dice sobre la memoria de largo plazo en agentes.',
    ],
  },
  {
    id: 'roi-es',
    category: 'ROI / Datos',
    lang: 'ES',
    count: 5,
    hooks: [
      '83% de reducción en tiempo de procesamiento. Así lo logramos.',
      'Tu equipo pierde en promedio 12 horas semanales en tareas que una IA puede hacer.',
      'Cada proceso sin automatizar cuesta entre $800 y $2000 al mes en horas/persona.',
      'ROI positivo en menos de 90 días: el umbral real de una implementación exitosa.',
      'Un cliente redujo su tiempo de onboarding de 3 semanas a 4 días.',
    ],
  },
  {
    id: 'build-es',
    category: 'Build in Public',
    lang: 'ES',
    count: 5,
    hooks: [
      'Esto es lo que nadie muestra de construir un sistema multi-agente desde cero.',
      'Fallamos tres veces antes de entender cómo escalar esto.',
      'Así resolvimos el problema de memoria en nuestro agente de conciliación financiera.',
      'Lo que aprendimos después de integrar IA en el ERP de nuestro primer cliente enterprise.',
      'Semana 3 construyendo en público: esto es lo que rompimos (y cómo lo arreglamos).',
    ],
  },
];

// ─── INSPIRATIONS DATA ────────────────────────────────────────────────────────

const INSPIRATIONS_DATA = [
  {
    id: 'ins-01',
    code: 'INS-01',
    title: 'Blueprint Grid Cover',
    description: 'Fondo carbono oscuro con patrón de puntos al 15% de opacidad. Tipografía Inter bold en blanco. Sensación técnica/arquitectónica ideal para covers de carrusel B2B.',
    tags: ['Blueprint', 'Grid', 'Dark Mode'],
    promptHint: 'dark carbon background with subtle dot grid pattern at 15% opacity, bold white Inter typography overlay reading "AI AGENTS", neon cyan accent lines, technical B2B aesthetic',
  },
  {
    id: 'ins-02',
    code: 'INS-02',
    title: 'Glassmorphism Metric Card',
    description: 'Panel translúcido con desenfoque sobre gradiente oscuro. Métrica principal en Fira Code (e.g., "83%") en cian neón. Profundidad visual premium sin imágenes de archivo.',
    tags: ['Glassmorphism', 'Métricas', 'Monospace'],
    promptHint: 'glassmorphism card with frosted glass effect over dark gradient background, "83%" in Fira Code monospace in neon cyan, electric blue accent glow, dark mode precision',
  },
  {
    id: 'ins-03',
    code: 'INS-03',
    title: 'Agent Flow Diagram',
    description: 'Diagrama de flujo de nodos conectados en estilo blueprint. Nodos cian sobre fondo carbono. Representa arquitectura de agentes sin recurrir a fotografías.',
    tags: ['Flow', 'Agentes', 'Técnico'],
    promptHint: 'isometric node-based flow diagram on dark carbon background, neon cyan nodes connected by electric lines, "AGENT FLOW" bold monospace label, blueprint technical aesthetic',
  },
  {
    id: 'ins-04',
    code: 'INS-04',
    title: 'Terminal Code Overlay',
    description: 'Ventana de terminal con fragmento de código. Syntax highlighting en colores oscuros. Proyecta precisión técnica inmediata sin texto en español (evita errores tipográficos).',
    tags: ['Código', 'Terminal', 'Dev'],
    promptHint: 'terminal window with code snippet on dark background, syntax highlighting with neon cyan and purple, "RUN AGENT" text overlay in bold sans-serif, technical dark mode',
  },
  {
    id: 'ins-05',
    code: 'INS-05',
    title: 'ROI Metric Highlight',
    description: 'Número prominente en Fira Code (tipografía monoespaciada) sobre fondo oscuro con degradado sutil. El dato duro como protagonista visual.',
    tags: ['ROI', 'Datos', 'Impacto'],
    promptHint: 'bold Fira Code "12 HRS" monospace text in neon cyan on dark carbon background, subtle blueprint grid, minimal B2B dark mode design, electric blue gradient accent',
  },
  {
    id: 'ins-06',
    code: 'INS-06',
    title: 'Workflow Timeline',
    description: 'Línea de tiempo horizontal con hitos clave: Discovery → Build → Deploy → Scale. Tipografía Geist sans-serif limpia. Ideal para carruseles que explican procesos.',
    tags: ['Timeline', 'Proceso', 'B2B'],
    promptHint: 'horizontal timeline diagram with milestone nodes "DISCOVER BUILD DEPLOY SCALE" in Geist Sans on dark background, electric blue connecting line, clean B2B technical aesthetic',
  },
];

// ─── EDITORIAL CALENDAR ───────────────────────────────────────────────────────

const EDITORIAL_CALENDAR: CalendarEntry[] = [
  { day: 1,  phase: 1, phaseName: 'Educación', topic: '¿Qué es un Sistema Agéntico Autónomo?', format: 'carousel',      platforms: ['linkedin'],           fluxPrompt: 'Nodos de red 3D interconectados en cian neón sobre fondo carbono, texto "BEYOND CHATBOTS".',  content_type: 'TÉCNICO' },
  { day: 2,  phase: 1, phaseName: 'Educación', topic: 'El cuello de botella de tu equipo de operaciones no es la falta de personal.', format: 'text_only',    platforms: ['x', 'linkedin'],     fluxPrompt: null, content_type: 'THOUGHT LEADERSHIP' },
  { day: 3,  phase: 1, phaseName: 'Educación', topic: 'Automatización Simple vs. Automatización de Extremo a Extremo.', format: 'single_image', platforms: ['linkedin'],           fluxPrompt: 'Infografía vectorial comparando proceso lineal vs. agéntico circular, paleta carbono y cian.', content_type: 'TÉCNICO' },
  { day: 4,  phase: 1, phaseName: 'Educación', topic: 'El verdadero costo del mantenimiento de software.', format: 'carousel',      platforms: ['linkedin'],           fluxPrompt: 'Gráfico financiero en terminal oscura, barras descendentes en cian neón, tipografía Geist.', content_type: 'ROI' },
  { day: 5,  phase: 1, phaseName: 'Educación', topic: '¿Por qué las herramientas No-Code fallan al escalar?', format: 'single_image', platforms: ['x'],                 fluxPrompt: 'Render isométrico de servidores abstracts, glassmorphism corporativo, estética blueprint.', content_type: 'TÉCNICO' },
  { day: 6,  phase: 1, phaseName: 'Educación', topic: 'ROI Cuantificable: métricas reales de implementación de IA B2B.', format: 'text_only',    platforms: ['linkedin'],           fluxPrompt: null, content_type: 'ROI' },
  { day: 7,  phase: 1, phaseName: 'Educación', topic: 'Resumen semana 1: de la estrategia a la ejecución.', format: 'single_image', platforms: ['instagram'],          fluxPrompt: 'Dashboard de KPIs limpio en carbono, cifras en cian monoespacio, colores de Puna Tech.', content_type: 'ROI' },
  { day: 8,  phase: 2, phaseName: 'Casos de Uso', topic: 'Un equipo de ventas operado por IA: de la prospección al contrato.', format: 'carousel',      platforms: ['linkedin'],           fluxPrompt: 'Diagrama de flujo hiper-realista, documentos digitales transformándose en datos estructurados.', content_type: 'ROI' },
  { day: 9,  phase: 2, phaseName: 'Casos de Uso', topic: 'Agentes de conciliación financiera: eliminando el error humano en FinOps.', format: 'single_image', platforms: ['x', 'linkedin'],     fluxPrompt: 'Código sobre base de datos segura, iluminación dramática cian eléctrico.', content_type: 'ROI' },
  { day: 10, phase: 2, phaseName: 'Casos de Uso', topic: 'Infraestructura personalizada: encaje perfecto, no plantillas.', format: 'text_only',    platforms: ['linkedin'],           fluxPrompt: null, content_type: 'TÉCNICO' },
  { day: 11, phase: 2, phaseName: 'Casos de Uso', topic: 'Atención al cliente Tier 3 resuelta por enjambres de agentes autónomos.', format: 'carousel',      platforms: ['instagram'],          fluxPrompt: 'Múltiples esferas de IA orbitando núcleo central, render 3D cristalino, cards glassmorphism.', content_type: 'TÉCNICO' },
  { day: 12, phase: 2, phaseName: 'Casos de Uso', topic: 'La diferencia entre automatizar una tarea y automatizar una decisión.', format: 'single_image', platforms: ['linkedin'],           fluxPrompt: 'Tablero de ajedrez abstracto de cristal, pieza luminosa moviéndose sola, autonomía algorítmica.', content_type: 'TÉCNICO' },
  { day: 13, phase: 2, phaseName: 'Casos de Uso', topic: 'Reducción de carga cognitiva gerencial vía reportes sintetizados por IA.', format: 'single_image', platforms: ['x'],                 fluxPrompt: 'Pantalla translúcida con métricas simplificadas, oficina ejecutiva nocturna, blueprint dark mode.', content_type: 'ROI' },
  { day: 14, phase: 2, phaseName: 'Casos de Uso', topic: 'Seguridad y privacidad en despliegues agénticos multi-tenant.', format: 'text_only',    platforms: ['linkedin'],           fluxPrompt: null, content_type: 'TÉCNICO' },
  { day: 15, phase: 2, phaseName: 'Casos de Uso', topic: 'Escalando operaciones logísticas sin contratar más coordinadores.', format: 'single_image', platforms: ['linkedin'],           fluxPrompt: 'Mapa topográfico digital con rutas optimizadas en tiempo real, colores carbono y cian eléctrico.', content_type: 'ROI' },
  { day: 16, phase: 3, phaseName: 'Arquitectura', topic: 'Orquestación Multi-Agente: cómo hacemos que los modelos colaboren.', format: 'carousel',      platforms: ['linkedin'],           fluxPrompt: 'Diagrama isométrico, servidores conectados con nodos LLM en la nube, cian neón sobre carbono.', content_type: 'TÉCNICO' },
  { day: 17, phase: 3, phaseName: 'Arquitectura', topic: 'Diseñando software que se repara a sí mismo.', format: 'single_image', platforms: ['x'],                 fluxPrompt: 'Engranajes digitales auto-ensamblándose, estética cyberpunk corporativa limpia, blueprint grid.', content_type: 'TÉCNICO' },
  { day: 18, phase: 3, phaseName: 'Arquitectura', topic: 'Latencia y rendimiento en arquitecturas LLM corporativas.', format: 'text_only',    platforms: ['linkedin'],           fluxPrompt: null, content_type: 'TÉCNICO' },
  { day: 19, phase: 3, phaseName: 'Arquitectura', topic: 'Human-in-the-Loop (HITL): cuándo la IA decide y cuándo el humano aprueba.', format: 'carousel',      platforms: ['instagram'],          fluxPrompt: 'Interfaz de aprobación de contenido, botón "APPROVE" en cian, diseño UI minimalista dark mode.', content_type: 'TÉCNICO' },
  { day: 20, phase: 3, phaseName: 'Arquitectura', topic: 'Gestión de contexto y memoria de largo plazo en Agentes B2B.', format: 'single_image', platforms: ['linkedin'],           fluxPrompt: 'Archivero digital infinito, haces de luz representando recuperación vectorial (RAG), cian sobre carbono.', content_type: 'TÉCNICO' },
  { day: 21, phase: 3, phaseName: 'Arquitectura', topic: 'Integración de sistemas legacy con infraestructuras cognitivas modernas.', format: 'text_only',    platforms: ['x'],                 fluxPrompt: null, content_type: 'TÉCNICO' },
  { day: 22, phase: 3, phaseName: 'Arquitectura', topic: 'Personalización del Modelo: por qué afinamos la IA para tu lógica de negocio.', format: 'single_image', platforms: ['linkedin'],           fluxPrompt: 'Microchip 3D estilizado adaptándose a huella dactilar, paleta carbono oscuro y cian.', content_type: 'TÉCNICO' },
  { day: 23, phase: 3, phaseName: 'Arquitectura', topic: 'El stack tecnológico de Puna Tech: robustez y escalabilidad.', format: 'carousel',      platforms: ['linkedin'],           fluxPrompt: 'Logos tech estilizados (Python, Next.js, Postgres) sobre fondo oscuro, tipografía Inter alto contraste.', content_type: 'BUILD IN PUBLIC' },
  { day: 24, phase: 4, phaseName: 'Conversión', topic: 'Calculá el costo de oportunidad de no automatizar tus procesos hoy.', format: 'single_image', platforms: ['linkedin'],           fluxPrompt: 'Gráfico financiero en cristal corporativo, curva exponencial de crecimiento, blueprint precision.', content_type: 'ROI' },
  { day: 25, phase: 4, phaseName: 'Conversión', topic: 'Auditoría de Flujos de Trabajo: el primer paso hacia un Sistema Agéntico.', format: 'carousel',      platforms: ['linkedin'],           fluxPrompt: 'Blueprint sobre mesa técnica, iluminación de estudio profesional. Texto: "AI AUDIT".', content_type: 'CTA' },
  { day: 26, phase: 4, phaseName: 'Conversión', topic: 'Dejá de comprar software. Empezá a construir ventajas operativas escalables.', format: 'text_only',    platforms: ['x'],                 fluxPrompt: null, content_type: 'THOUGHT LEADERSHIP' },
  { day: 27, phase: 4, phaseName: 'Conversión', topic: 'Impacto medible: ¿qué métricas importan cuando desplegás una IA personalizada?', format: 'single_image', platforms: ['instagram'],          fluxPrompt: 'Dashboard de KPIs flat design, colores carbono resaltando porcentajes de ahorro en cian neón.', content_type: 'ROI' },
  { day: 28, phase: 4, phaseName: 'Conversión', topic: 'Del mapeo de procesos al despliegue: así es trabajar con Puna Tech.', format: 'carousel',      platforms: ['linkedin'],           fluxPrompt: 'Timeline visual elegante: Discovery → Build → Deploy → Scale, tipografía Geist, dark mode.', content_type: 'CTA' },
  { day: 29, phase: 4, phaseName: 'Conversión', topic: 'Preparando tu negocio B2B para la era de la Swarm AI.', format: 'text_only',    platforms: ['linkedin'],           fluxPrompt: null, content_type: 'THOUGHT LEADERSHIP' },
  { day: 30, phase: 4, phaseName: 'Conversión', topic: 'Hablemos de tu operación. Agendá una consulta técnica estratégica.', format: 'single_image', platforms: ['linkedin', 'x'],     fluxPrompt: 'Sala de conferencias corporativa vacía, minimalista, invitando al espectador a tomar asiento.', content_type: 'CTA' },
];

// ─── HELPER COMPONENTS ────────────────────────────────────────────────────────

interface CarouselPreviewProps {
  urls: string[];
  activeIndex?: number;
  onActiveIndexChange?: (idx: number) => void;
}

function CarouselPreview({ urls, activeIndex, onActiveIndexChange }: CarouselPreviewProps) {
  const [localIndex, setLocalIndex] = useState(0);
  const index = activeIndex !== undefined ? activeIndex : localIndex;
  const setIndex = onActiveIndexChange !== undefined ? onActiveIndexChange : setLocalIndex;

  const handlePrev = () => {
    const nextIdx = (index - 1 + urls.length) % urls.length;
    setIndex(nextIdx);
  };

  const handleNext = () => {
    const nextIdx = (index + 1) % urls.length;
    setIndex(nextIdx);
  };

  return (
    <div className="relative aspect-[4/5] rounded-sm overflow-hidden bg-[#111218] group/carpreview">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={urls[index]} alt={`Slide ${index + 1}`} className="w-full h-full object-cover transition-all duration-300" />
      <div className="absolute bottom-3 left-0 right-0 flex justify-center space-x-1.5">
        {urls.map((_, i) => (
          <button key={i} type="button" onClick={() => setIndex(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${i === index ? 'bg-[#00d4ff] scale-125' : 'bg-white/30'}`} />
        ))}
      </div>
      <div className="absolute top-2 right-2 bg-black/60 text-[#00d4ff] text-[8px] font-mono px-1.5 py-0.5 rounded-sm tracking-wider border border-[#00d4ff]/20">
        {index + 1}/{urls.length}
      </div>
      <button type="button" onClick={handlePrev} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-sm bg-black/60 border border-white/10 text-white flex items-center justify-center opacity-0 group-hover/carpreview:opacity-100 transition-opacity">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
      </button>
      <button type="button" onClick={handleNext} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-sm bg-black/60 border border-white/10 text-white flex items-center justify-center opacity-0 group-hover/carpreview:opacity-100 transition-opacity">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  );
}

function renderMediaPreview(mediaUrl: string | undefined, activeIndex?: number, onActiveIndexChange?: (idx: number) => void) {
  if (!mediaUrl) return null;
  if (mediaUrl.trim().startsWith('[')) {
    try {
      const urls: string[] = JSON.parse(mediaUrl);
      if (Array.isArray(urls) && urls.length > 0) return <CarouselPreview urls={urls} activeIndex={activeIndex} onActiveIndexChange={onActiveIndexChange} />;
    } catch { /* empty */ }
  }
  return (
    <div className="relative aspect-[4/5] rounded-sm overflow-hidden bg-[#111218]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mediaUrl} alt="Post Visual" className="w-full h-full object-cover" />
    </div>
  );
}

// ─── NAV ITEM COMPONENT ───────────────────────────────────────────────────────

function NavItem({ icon, label, count, active, onClick }: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-sm text-xs transition-all group ${
        active ? 'bg-[#1a0f0f] text-[#f8f4f0]' : 'text-[#c2b9af] hover:text-[#f8f4f0] hover:bg-white/[0.03]'
      }`}
    >
      <div className="flex items-center space-x-2.5">
        <span className={`transition-colors ${active ? 'text-[#af4c24]' : 'text-[#6d2c2c] group-hover:text-[#c2b9af]'}`}>{icon}</span>
        <span className="font-medium tracking-wide">{label}</span>
      </div>
      {count !== undefined && (
        <span className={`text-[10px] font-mono tabular-nums ${active ? 'text-[#af4c24]' : 'text-[#6d2c2c]'}`}>{count}</span>
      )}
    </button>
  );
}

// ─── CONTENT TYPE BADGE ────────────────────────────────────────────────────────

function ContentTypeBadge({ type, dotOnly }: { type: ContentTypeName; dotOnly?: boolean }) {
  const cfg = CONTENT_TYPE_CONFIG[type];
  if (dotOnly) return <span className={`w-1.5 h-1.5 rounded-full inline-block flex-shrink-0 ${cfg.dot}`} />;
  return (
    <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-sm text-[9px] font-mono font-bold border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      <span>{type}</span>
    </span>
  );
}

// ─── SIDEBAR DRAFT ITEM ────────────────────────────────────────────────────────

function SidebarDraftItem({ draft, isActive, onClick }: {
  draft: GeneratedAsset;
  isActive: boolean;
  onClick: () => void;
}) {
  const ct = getContentType(draft);
  const cfg = CONTENT_TYPE_CONFIG[ct];
  const dateInfo = formatSidebarDate(draft.created_at);
  const title = draft.generated_text.split('\n')[0].replace(/\*\*/g, '').slice(0, 42) + (draft.generated_text.length > 42 ? '...' : '');
  const statusDot = draft.approval_status === 'approved' ? 'bg-emerald-400' : draft.approval_status === 'rejected' ? 'bg-red-400/60' : cfg.dot;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 border-b border-[#2a0e0e]/60 flex items-start space-x-2 transition-all hover:bg-white/[0.03] ${
        isActive ? 'bg-[#1a0c0c] border-l-2 border-l-[#af4c24]' : 'border-l-2 border-l-transparent'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-1.5 mb-1">
          <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-sm text-[9px] font-mono font-bold border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
            <span>{ct}</span>
          </span>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot}`} />
        </div>
        <p className="text-[11px] text-[#c2b9af] leading-tight truncate pr-1">{title}</p>
      </div>
      <div className="flex-shrink-0 text-right pt-0.5">
        <p className="text-[9px] font-mono text-[#af4c24] leading-none">{dateInfo.month}</p>
        <p className="text-[13px] font-bold text-[#f8f4f0] leading-tight font-mono">{dateInfo.day}</p>
        <p className="text-[9px] font-mono text-[#6d2c2c] leading-none">{dateInfo.weekday}</p>
      </div>
    </button>
  );
}

// ─── CALENDAR HELPERS ─────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstWeekday(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const BACKEND_URL = 'http://127.0.0.1:8000';
  const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000000';

  // Layout State
  const [activeSection, setActiveSection] = useState<AppSection>('readyToPost');
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [activePlatformTab, setActivePlatformTab] = useState<PlatformTab>('instagram');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [hookSearch, setHookSearch] = useState('');
  const [calendarDate, setCalendarDate] = useState(new Date());

  const [copyFeedback, setCopyFeedback] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // Reset slide index on draft switch
  useEffect(() => {
    setActiveSlideIndex(0);
  }, [activeDraftId]);

  // Data State
  const [drafts, setDrafts] = useState<GeneratedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeUser, setActiveUser] = useState<UserProfile | null>(null);
  const [templates, setTemplates] = useState<PreferenceTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Form State
  const [formTopic, setFormTopic] = useState('');
  const [formPlatforms, setFormPlatforms] = useState<('linkedin' | 'x' | 'instagram')[]>(['linkedin']);
  const [brandColors, setBrandColors] = useState('');
  const [visualStyle, setVisualStyle] = useState('');
  const [toneModifier, setToneModifier] = useState('');
  const [visualFormat, setVisualFormat] = useState<'text_only' | 'single_image' | 'carousel' | 'hybrid'>('single_image');
  const [imageModel, setImageModel] = useState('recraft-ai/recraft-v3');
  const [generating, setGenerating] = useState(false);
  const [generationSuccess, setGenerationSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Overlay Template State
  const [baseImages, setBaseImages] = useState<{id: string, name: string, url: string}[]>([]);
  const [showOverlayModal, setShowOverlayModal] = useState(false);
  const [selectedBaseImage, setSelectedBaseImage] = useState<{id: string, name: string, url: string} | null>(null);

  // Console + Metrics
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [hoursSaved, setHoursSaved] = useState(24.5);
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  // Load
  useEffect(() => {
    const saved = localStorage.getItem('puna_hours_saved');
    if (saved) setHoursSaved(parseFloat(saved));
    fetchUsers();
    fetchDrafts();
    fetchBaseImages();
  }, []);

  const fetchBaseImages = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/brand-library/templates`);
      if (res.ok) {
        const data = await res.json();
        setBaseImages(data);
      }
    } catch (e) {
      console.warn("Failed to fetch base images", e);
    }
  };

  useEffect(() => {
    if (consoleBottomRef.current) consoleBottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [consoleLogs]);

  useEffect(() => {
    const pending = drafts.filter(d => d.approval_status === 'draft');
    if (pending.length > 0 && (!activeDraftId || !pending.find(d => d.id === activeDraftId))) {
      setActiveDraftId(pending[0].id);
    }
  }, [drafts]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (['TEXTAREA', 'INPUT', 'SELECT'].includes((document.activeElement as HTMLElement)?.tagName)) return;
      const pending = drafts.filter(d => d.approval_status === 'draft');
      if (!pending.length) return;
      const idx = pending.findIndex(d => d.id === activeDraftId);
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); setActiveDraftId(pending[(idx + 1) % pending.length].id); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); setActiveDraftId(pending[(idx - 1 + pending.length) % pending.length].id); }
      else if ((e.key === 'a' || e.key === 'A') && activeDraftId) { e.preventDefault(); handleAction(activeDraftId, 'approved'); }
      else if ((e.key === 'd' || e.key === 'D') && activeDraftId) { e.preventDefault(); handleAction(activeDraftId, 'rejected'); }
      else if (e.key === 'n' || e.key === 'N') { setShowGenerateModal(true); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [drafts, activeDraftId]);

  // API Calls
  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/generate/drafts`);
      if (res.ok) {
        const data = await res.json();
        setDrafts(data.length > 0 ? data : MOCK_DRAFTS);
      } else {
        setDrafts(MOCK_DRAFTS);
      }
    } catch {
      setDrafts(MOCK_DRAFTS);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/users`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setUsers(data); setActiveUser(data[0]); fetchTemplates(data[0].company_id);
        } else throw new Error();
      } else throw new Error();
    } catch {
      setUsers(MOCK_USERS); setActiveUser(MOCK_USERS[0]); fetchTemplates(MOCK_USERS[0].company_id);
    }
  };

  const fetchTemplates = async (companyId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/templates?company_id=${companyId}`);
      if (res.ok) { const data = await res.json(); setTemplates(data.length > 0 ? data : MOCK_TEMPLATES); }
      else setTemplates(MOCK_TEMPLATES);
    } catch { setTemplates(MOCK_TEMPLATES); }
  };

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    setHoursSaved(prev => { const n = prev + (action === 'approved' ? 1.5 : 0.5); localStorage.setItem('puna_hours_saved', n.toFixed(1)); return n; });
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, approval_status: action } : d));
    if (id.startsWith('mock-')) return;
    try { await fetch(`${BACKEND_URL}/api/v1/generate/assets/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: action }) }); } catch { /* empty */ }
  };

  const handleResetToDraft = async (id: string) => {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, approval_status: 'draft' } : d));
    if (id.startsWith('mock-')) return;
    try { await fetch(`${BACKEND_URL}/api/v1/generate/assets/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'draft' }) }); } catch { /* empty */ }
  };

  const handleLoadTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const temp = templates.find(t => t.id === id);
    if (temp) {
      setBrandColors(temp.brand_colors || '');
      setVisualStyle(temp.visual_style_guidelines || '');
      setToneModifier(temp.tone_modifier || '');
      setFormPlatforms(temp.platforms);
      setVisualFormat(temp.visual_format as 'text_only' | 'single_image' | 'carousel' || 'single_image');
      setImageModel(temp.image_model || 'black-forest-labs/flux-schnell');
    }
  };

  const runConsoleSimulations = () => {
    setConsoleLogs(['[INFO] Iniciando secuencia de generación autónoma...']);
    const steps = [
      { text: '[OK] Conectando con Puna Tech Engine...', delay: 500 },
      { text: '[OK] Cliente Gemini API inicializado.', delay: 1200 },
      { text: '[INFO] Agente Redactor: generando borrador con Gemini 2.5-flash...', delay: 2000 },
      { text: '[OK] Agente Redactor: borrador inicial listo.', delay: 5200 },
      { text: '[INFO] Agente Crítico: auditando tono B2B y clichés...', delay: 6000 },
      { text: '[OK] Agente Crítico: contenido refinado y aprobado.', delay: 8500 },
      { text: `[INFO] Conectando con Replicate (${imageModel.split('/')[1] || 'flux-schnell'})...`, delay: 9500 },
      { text: '[SUCCESS] Borradores generados y persistidos. Pipeline completado.', delay: 13000 },
    ];
    steps.forEach(s => setTimeout(() => setConsoleLogs(prev => [...prev, s.text]), s.delay));
  };

  const [overlayTopic, setOverlayTopic] = useState('');
  
  const handleOverlayGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBaseImage || !overlayTopic.trim()) return;
    
    setGenerating(true); setGenerationSuccess(null); setErrorMsg(null);
    setConsoleLogs(['[INFO] Iniciando secuencia de overlay template...']);
    setTimeout(() => setConsoleLogs(prev => [...prev, '[INFO] Editando imagen base y aplicando tipografía...']), 2000);
    
    const companyId = activeUser?.company_id || DEFAULT_COMPANY_ID;
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/generation/overlay`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          company_id: companyId, 
          topic: overlayTopic,
          base_image_url: selectedBaseImage.url,
          platforms: ['instagram']
        }),
      });
      if (res.ok) {
        const data: GeneratedAsset[] = await res.json();
        setDrafts(prev => [...data, ...prev]);
        if (data.length > 0) {
          setActiveDraftId(data[0].id);
          setActiveSection('readyToPost');
        }
        setOverlayTopic('');
        setShowOverlayModal(false);
      } else {
        const err = await res.json();
        throw new Error(err.detail);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error en overlay generation');
    } finally {
      setGenerating(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTopic.trim() || formPlatforms.length === 0) return;
    setGenerating(true); setGenerationSuccess(null); setErrorMsg(null);
    runConsoleSimulations();
    const companyId = activeUser?.company_id || DEFAULT_COMPANY_ID;
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/generate/manual`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, topic: formTopic, platforms: formPlatforms, brand_colors: brandColors || undefined, visual_style_guidelines: visualStyle || undefined, tone_modifier: toneModifier || undefined, skip_image: visualFormat === 'text_only', visual_format: visualFormat, image_model: imageModel }),
      });
      if (res.ok) {
        const data: GeneratedAsset[] = await res.json();
        setDrafts(prev => [...data, ...prev]);
        // Navigate immediately to the first generated asset
        if (data.length > 0) {
          setActiveDraftId(data[0].id);
          setActiveSection('readyToPost');
        }
        setFormTopic('');
        setGenerationSuccess(`✓ Borradores generados para ${formPlatforms.map(p => p.toUpperCase()).join(', ')}`);
        setTimeout(() => { setShowGenerateModal(false); setGenerationSuccess(null); }, 2500);
      } else {
        const err = await res.json();
        throw new Error(err.detail);
      }
    } catch {
      setTimeout(() => {
        // Build realistic mock media for demo/offline mode
        const DEMO_CAROUSEL_URLS = JSON.stringify([
          'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600',
          'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600',
          'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=600',
        ]);
        const demoMediaUrl =
          visualFormat === 'text_only' ? undefined :
          visualFormat === 'carousel' ? DEMO_CAROUSEL_URLS :
          'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600';

        const newAssets: GeneratedAsset[] = formPlatforms.map(plat => ({
          id: `mock-${Date.now()}-${plat}`,
          company_id: companyId,
          platform_name: plat,
          generated_text: visualFormat === 'carousel'
            ? `[Demo] ${formTopic}\n\nSlide 1: Introducción al tema y hook principal.\n\nSlide 2: El problema que resuelve esta solución.\n\nSlide 3: Cómo funciona paso a paso.\n\nSlide 4: Resultados medibles y ROI.\n\nSlide 5: Call to Action — puna-tech.com`
            : `[Demo] ${formTopic}\n\nEste es un borrador de demostración generado para ${plat.toUpperCase()}.`,
          media_url: demoMediaUrl,
          approval_status: 'draft',
          created_at: new Date().toISOString(),
        }));
        setDrafts(prev => [...newAssets, ...prev]);
        setActiveDraftId(newAssets[0].id);
        setActiveSection('readyToPost');
        setFormTopic('');
        setGenerationSuccess(`[Demo] Borradores simulados para ${formPlatforms.map(p => p.toUpperCase()).join(', ')}`);
        setTimeout(() => { setShowGenerateModal(false); setGenerationSuccess(null); }, 2500);
      }, 3000);
    } finally {
      setTimeout(() => setGenerating(false), 4000);
    }
  };

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  // Derived data
  const pendingDrafts = drafts.filter(d => d.approval_status === 'draft');
  const approvedDrafts = drafts.filter(d => d.approval_status === 'approved');
  const activeDraft = drafts.find(d => d.id === activeDraftId) || null;
  const totalHooks = HOOKS_DATA.reduce((s, g) => s + g.hooks.length, 0);
  const filteredHooks = hookSearch.trim()
    ? HOOKS_DATA.map(g => ({ ...g, hooks: g.hooks.filter(h => h.toLowerCase().includes(hookSearch.toLowerCase())) })).filter(g => g.hooks.length > 0)
    : HOOKS_DATA;

  // Calendar calculations
  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstWeekday = getFirstWeekday(calYear, calMonth);
  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const weekdays = ['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM'];

  // ─── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#0d0505] text-[#f8f4f0] font-sans overflow-hidden">

      {/* ── SIDEBAR ──────────────────────────────────────────────────────────── */}
      <aside className="w-[220px] flex-shrink-0 border-r border-[#2a0e0e]/80 flex flex-col bg-[#0d0505]">

        {/* Header */}
        <div className="px-4 pt-5 pb-3 border-b border-[#2a0e0e]/60">
          <div className="flex items-center space-x-2 mb-0.5">
            <div className="w-6 h-6 bg-[#af4c24] rounded-sm flex items-center justify-center flex-shrink-0">
              <span className="font-mono font-bold text-white text-xs">P</span>
            </div>
            <span className="font-bold text-sm text-[#f8f4f0] tracking-wide">Puna Tech</span>
          </div>
          <p className="text-[9px] font-mono text-[#af4c24] tracking-widest pl-8">CONTENT DASHBOARD</p>
        </div>

        {/* Nav */}
        <nav className="p-2 space-y-0.5 border-b border-[#2a0e0e]/40">
          <NavItem
            active={activeSection === 'calendar'}
            onClick={() => setActiveSection('calendar')}
            label="Calendar"
            icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          />
          <NavItem
            active={activeSection === 'readyToPost'}
            onClick={() => setActiveSection('readyToPost')}
            label="Ready to post"
            icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <NavItem
            active={activeSection === 'ganchos'}
            onClick={() => setActiveSection('ganchos')}
            label="Ganchos"
            count={totalHooks}
            icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>}
          />
          <NavItem
            active={activeSection === 'inspiraciones'}
            onClick={() => setActiveSection('inspiraciones')}
            label="Inspiraciones"
            count={INSPIRATIONS_DATA.length}
            icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
          />
          <NavItem
            active={activeSection === 'categorias'}
            onClick={() => setActiveSection('categorias')}
            label="Categorías"
            count={Object.keys(CONTENT_TYPE_CONFIG).length}
            icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>}
          />
          <NavItem
            active={activeSection === 'brandLibrary'}
            onClick={() => setActiveSection('brandLibrary')}
            label="Brand Library"
            icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          />
          <NavItem
            active={activeSection === 'imageTemplates'}
            onClick={() => setActiveSection('imageTemplates')}
            label="Plantillas de Imagen"
            icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          />
        </nav>

        {/* Draft List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* DRAFT section */}
          <div className="px-3 pt-3 pb-1.5 flex items-center justify-between">
            <span className="text-[9px] font-mono text-[#6d2c2c] uppercase tracking-widest">
              DRAFT {pendingDrafts.length}
            </span>
          </div>
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-4 h-4 border-2 border-[#af4c24] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            pendingDrafts.map(draft => (
              <SidebarDraftItem
                key={draft.id}
                draft={draft}
                isActive={draft.id === activeDraftId}
                onClick={() => { setActiveDraftId(draft.id); setActiveSection('readyToPost'); setActivePlatformTab(draft.platform_name as PlatformTab); }}
              />
            ))
          )}

          {/* HISTORIAL section */}
          {approvedDrafts.length > 0 && (
            <>
              <div className="px-3 pt-4 pb-1.5">
                <span className="text-[9px] font-mono text-[#6d2c2c] uppercase tracking-widest">
                  HISTORIAL {approvedDrafts.length}
                </span>
              </div>
              {approvedDrafts.map(draft => (
                <SidebarDraftItem
                  key={draft.id}
                  draft={draft}
                  isActive={draft.id === activeDraftId}
                  onClick={() => { setActiveDraftId(draft.id); setActiveSection('readyToPost'); setActivePlatformTab(draft.platform_name as PlatformTab); }}
                />
              ))}
            </>
          )}
        </div>

        {/* Bottom: New + Profile */}
        <div className="p-2 border-t border-[#2a0e0e]/60 space-y-1.5">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="w-full flex items-center justify-center space-x-2 bg-[#af4c24] hover:bg-[#8c3b1a] text-white font-bold text-xs px-3 py-2 rounded-sm transition-all font-mono tracking-wider"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
            <span>NEW CONTENT</span>
          </button>
          <div className="flex items-center space-x-2 px-1">
            <div className="w-5 h-5 rounded-sm bg-[#2a0e0e] border border-[#6d2c2c]/40 flex items-center justify-center flex-shrink-0">
              <span className="text-[9px] font-mono text-[#af4c24] font-bold">{(activeUser?.full_name || 'P')[0]}</span>
            </div>
            <span className="text-[10px] text-[#c2b9af] truncate">{activeUser?.full_name || 'Puna Tech'}</span>
          </div>
        </div>
      </aside>

      {/* ── MAIN PANEL ───────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* ── READY TO POST VIEW ───────────────────────────────────────── */}
        {activeSection === 'readyToPost' && (
          <div className="flex-1 flex overflow-hidden">
            {activeDraft ? (
              <>
                {/* Left: Visual Panel */}
                <div className="w-[340px] flex-shrink-0 border-r border-[#2a0e0e]/60 flex flex-col overflow-hidden">
                  {/* Platform Tabs */}
                  <div className="border-b border-[#2a0e0e]/60 px-4 pt-4 pb-0">
                    <div className="flex space-x-1">
                      {(['instagram', 'x', 'linkedin', 'copy'] as PlatformTab[]).map(tab => {
                        const isCopyBtn = tab === 'copy';
                        const match = isCopyBtn ? null : drafts.find(d => 
                          d.platform_name === tab && 
                          Math.abs(new Date(d.created_at).getTime() - new Date(activeDraft.created_at).getTime()) < 60000
                        );
                        const isAvailable = isCopyBtn || !!match;
                        return (
                          <button
                            key={tab}
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => {
                              if (isCopyBtn) {
                                handleCopy(activeDraft.generated_text);
                              } else if (match) {
                                setActiveDraftId(match.id);
                                setActivePlatformTab(tab);
                              }
                            }}
                            className={`px-3 py-2 text-xs font-medium capitalize transition-all border-b-2 disabled:opacity-30 disabled:cursor-not-allowed ${
                              activePlatformTab === tab && !isCopyBtn
                                ? 'border-[#af4c24] text-[#f8f4f0]'
                                : 'border-transparent text-[#6d2c2c] hover:text-[#c2b9af]'
                            }`}
                          >
                            {tab === 'x' ? 'X' : tab === 'copy' ? '⌘ Copy' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Image Preview */}
                  <div className="flex-1 overflow-y-auto p-4">
                    {activeDraft.media_url ? (
                      renderMediaPreview(activeDraft.media_url, activeSlideIndex, setActiveSlideIndex)
                    ) : (
                      <div className="aspect-[4/5] rounded-sm bg-[#111218] border border-[#2a0e0e]/60 flex flex-col items-center justify-center space-y-2">
                        <svg className="w-8 h-8 text-[#6d2c2c]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01" /></svg>
                        <span className="text-[10px] font-mono text-[#6d2c2c]">TEXT ONLY</span>
                      </div>
                    )}

                    {/* Platform badge */}
                    <div className="mt-3 flex items-center space-x-2">
                      <ContentTypeBadge type={getContentType(activeDraft)} />
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm border ${
                        activeDraft.platform_name === 'linkedin' ? 'text-sky-400 bg-sky-950/30 border-sky-800/40' :
                        activeDraft.platform_name === 'x' ? 'text-zinc-400 bg-zinc-900/30 border-zinc-700/40' :
                        'text-pink-400 bg-pink-950/30 border-pink-800/40'
                      }`}>
                        {activeDraft.platform_name.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Content Detail Panel */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Header */}
                  <div className="px-6 pt-5 pb-4 border-b border-[#2a0e0e]/60 flex items-start justify-between">
                    <div className="flex-1 min-w-0 mr-4">
                      <h2 className="text-base font-bold text-[#f8f4f0] leading-snug line-clamp-2">
                        {activeDraft.generated_text.split('\n')[0].replace(/\*\*/g, '')}
                      </h2>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-sm border ${
                          activeDraft.approval_status === 'draft' ? 'text-[#c2b9af] bg-[#2a0e0e]/40 border-[#6d2c2c]/40' :
                          activeDraft.approval_status === 'approved' ? 'text-emerald-400 bg-emerald-950/30 border-emerald-800/40' :
                          'text-red-400 bg-red-950/30 border-red-800/40'
                        }`}>
                          {activeDraft.approval_status.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-[#6d2c2c] font-mono">
                          {new Date(activeDraft.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <button
                        onClick={() => handleCopy(activeDraft.generated_text)}
                        className={`px-3 py-1.5 text-[10px] font-mono border rounded-sm transition-colors flex items-center space-x-1.5 ${
                          copyFeedback ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/20' : 'border-[#6d2c2c]/40 text-[#c2b9af] hover:text-[#f8f4f0]'
                        }`}
                      >
                        {copyFeedback ? (
                          <>
                            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                            <span>¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            <span>Pull</span>
                          </>
                        )}
                      </button>
                      {activeDraft.approval_status === 'draft' && (
                        <button
                          onClick={() => handleAction(activeDraft.id, 'approved')}
                          className="px-4 py-1.5 bg-[#af4c24] hover:bg-[#8c3b1a] text-white font-bold text-xs rounded-sm transition-all flex items-center space-x-1.5 font-mono"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          <span>Ship it</span>
                        </button>
                      )}
                      {activeDraft.approval_status === 'approved' && (
                        <button onClick={() => handleResetToDraft(activeDraft.id)} className="px-3 py-1.5 text-[10px] font-mono border border-[#6d2c2c]/40 text-[#c2b9af] hover:text-[#f8f4f0] rounded-sm transition-colors">
                          Reset Draft
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Content Body */}
                  <div className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-6">

                      {/* Export if has media */}
                      {activeDraft.media_url && (
                        <div className="bg-[#111218] border border-[#2a0e0e]/60 rounded-sm p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-mono text-[#6d2c2c] uppercase tracking-wider">EXPORTAR PNG</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => window.open(activeDraft.media_url?.trim().startsWith('[') ? JSON.parse(activeDraft.media_url)[0] : activeDraft.media_url, '_blank')}
                              className="flex items-center space-x-1.5 px-3 py-2 bg-[#af4c24]/10 border border-[#af4c24]/30 text-[#af4c24] hover:bg-[#af4c24]/20 rounded-sm text-[10px] font-mono font-bold transition-all"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                              <span>Save all (PNG)</span>
                            </button>
                            {activeDraft.media_url.trim().startsWith('[') && (() => {
                              try {
                                const urls: string[] = JSON.parse(activeDraft.media_url);
                                return (
                                  <div className="flex items-center space-x-1">
                                    {urls.map((url, i) => (
                                      <button key={i} onClick={() => window.open(url, '_blank')} className="w-7 h-7 text-[9px] font-mono border border-[#2a0e0e]/60 text-[#c2b9af] hover:text-[#f8f4f0] hover:border-[#6d2c2c] rounded-sm transition-colors flex items-center justify-center">
                                        {String(i + 1).padStart(2, '0')}
                                      </button>
                                    ))}
                                  </div>
                                );
                              } catch { return null; }
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Caption */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono text-[#6d2c2c] uppercase tracking-wider">CAPTION</span>
                          <button
                            onClick={() => handleCopy(activeDraft.generated_text)}
                            className={`text-[9px] font-mono flex items-center space-x-1 transition-colors ${
                              copyFeedback ? 'text-emerald-400 font-bold' : 'text-[#6d2c2c] hover:text-[#af4c24]'
                            }`}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            <span>{copyFeedback ? '¡Copiado!' : 'Copy'}</span>
                          </button>
                        </div>
                        <div className="bg-[#111218] border border-[#2a0e0e]/40 rounded-sm p-4">
                          <p className="text-sm text-[#c2b9af] leading-relaxed whitespace-pre-wrap font-sans">
                            {activeDraft.generated_text}
                          </p>
                        </div>
                      </div>

                      {/* Slides (if carousel) */}
                      {activeDraft.generated_text.includes('Slide') && (
                        <div>
                          <span className="text-[10px] font-mono text-[#6d2c2c] uppercase tracking-wider block mb-2">
                            SLIDES ({activeDraft.generated_text.split('\n').filter(l => l.match(/^Slide \d/i)).length})
                          </span>
                          <div className="space-y-2">
                            {activeDraft.generated_text.split('\n')
                              .filter(line => line.match(/^Slide \d/i))
                              .map((slide, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => setActiveSlideIndex(i)}
                                  className={`w-full flex items-start space-x-3 bg-[#111218] border rounded-sm p-3 text-left transition-all ${
                                    activeSlideIndex === i
                                      ? 'border-[#00d4ff]/40 shadow-[0_0_8px_rgba(0,212,255,0.05)]'
                                      : 'border-[#2a0e0e]/40 hover:border-[#6d2c2c]/60'
                                  }`}
                                >
                                  <span className={`text-[10px] font-mono font-bold flex-shrink-0 pt-0.5 ${
                                    activeSlideIndex === i ? 'text-[#00d4ff]' : 'text-[#af4c24]'
                                  }`}>
                                    {String(i + 1).padStart(2, '0')}
                                  </span>
                                  <p className={`text-xs leading-relaxed ${
                                    activeSlideIndex === i ? 'text-[#f8f4f0]' : 'text-[#c2b9af]'
                                  }`}>{slide}</p>
                                </button>
                              ))
                            }
                          </div>
                        </div>
                      )}

                      {/* Discard button */}
                      {activeDraft.approval_status === 'draft' && (
                        <button
                          onClick={() => handleAction(activeDraft.id, 'rejected')}
                          className="w-full py-2 text-xs font-mono border border-[#2a0e0e]/60 text-[#6d2c2c] hover:text-red-400 hover:border-red-900/30 rounded-sm transition-colors"
                        >
                          Descartar borrador
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center space-y-3 text-center p-8">
                <div className="w-12 h-12 rounded-sm bg-[#111218] border border-[#2a0e0e]/60 flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#6d2c2c]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#f8f4f0]">Seleccioná un borrador</p>
                  <p className="text-xs text-[#6d2c2c] mt-1">O generá contenido nuevo con el botón NEW CONTENT</p>
                </div>
                <button onClick={() => setShowGenerateModal(true)} className="px-4 py-2 bg-[#af4c24] text-white text-xs font-bold font-mono rounded-sm hover:bg-[#8c3b1a] transition-colors">
                  + NEW CONTENT
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── CALENDAR VIEW ─────────────────────────────────────────────── */}
        {activeSection === 'calendar' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Calendar Header */}
            <div className="px-6 py-4 border-b border-[#2a0e0e]/60 flex items-center justify-between flex-shrink-0">
              <h2 className="text-base font-bold text-[#f8f4f0]">{monthNames[calMonth]} {calYear}</h2>
              <div className="flex items-center space-x-2">
                <button onClick={() => setCalendarDate(new Date())} className="px-3 py-1.5 text-[10px] font-mono border border-[#6d2c2c]/40 text-[#c2b9af] hover:text-[#f8f4f0] rounded-sm transition-colors">today</button>
                <button onClick={() => setCalendarDate(new Date(calYear, calMonth - 1, 1))} className="w-7 h-7 flex items-center justify-center border border-[#6d2c2c]/40 text-[#c2b9af] hover:text-[#f8f4f0] rounded-sm transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button onClick={() => setCalendarDate(new Date(calYear, calMonth + 1, 1))} className="w-7 h-7 flex items-center justify-center border border-[#6d2c2c]/40 text-[#c2b9af] hover:text-[#f8f4f0] rounded-sm transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-auto p-4">
              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {weekdays.map(d => (
                  <div key={d} className="text-center text-[10px] font-mono text-[#6d2c2c] tracking-wider py-2">{d}</div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 border-l border-t border-[#2a0e0e]/40">
                {/* Empty cells for offset */}
                {Array.from({ length: firstWeekday }).map((_, i) => (
                  <div key={`empty-${i}`} className="border-r border-b border-[#2a0e0e]/40 min-h-[100px] bg-[#0a0404]/50" />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const today = new Date();
                  const isToday = today.getDate() === dayNum && today.getMonth() === calMonth && today.getFullYear() === calYear;
                  const calItems = EDITORIAL_CALENDAR.filter(e => e.day === dayNum);
                  const assetItems = drafts.filter(d => {
                    const dt = new Date(d.created_at);
                    return dt.getDate() === dayNum && dt.getMonth() === calMonth && dt.getFullYear() === calYear;
                  });

                  return (
                    <div key={dayNum} className={`border-r border-b border-[#2a0e0e]/40 min-h-[100px] p-1.5 relative ${isToday ? 'bg-[#1a0c0c]' : 'hover:bg-[#0f0808] transition-colors'}`}>
                      <span className={`text-xs font-mono font-bold mb-1 block ${isToday ? 'text-[#af4c24]' : 'text-[#6d2c2c]'}`}>
                        {dayNum}
                      </span>
                      <div className="space-y-0.5">
                        {assetItems.map(a => (
                          <button
                            key={a.id}
                            onClick={() => { setActiveDraftId(a.id); setActiveSection('readyToPost'); }}
                            className="w-full text-left px-1 py-0.5 rounded-sm text-[9px] font-medium truncate bg-[#af4c24]/15 border border-[#af4c24]/30 text-[#af4c24] hover:bg-[#af4c24]/25 transition-colors"
                          >
                            {a.generated_text.split('\n')[0].slice(0, 30)}
                          </button>
                        ))}
                        {calItems.map((entry, ci) => {
                          const cfg = CONTENT_TYPE_CONFIG[entry.content_type];
                          return (
                            <button
                              key={ci}
                              onClick={() => { setFormTopic(entry.topic); setFormPlatforms(entry.platforms); setVisualFormat(entry.format); if (entry.fluxPrompt) setVisualStyle(entry.fluxPrompt); setShowGenerateModal(true); }}
                              className={`w-full text-left px-1 py-0.5 rounded-sm text-[9px] truncate border transition-colors ${cfg.bg} ${cfg.border} ${cfg.color} hover:opacity-80`}
                            >
                              {entry.topic.slice(0, 30)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── GANCHOS VIEW ──────────────────────────────────────────────── */}
        {activeSection === 'ganchos' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#2a0e0e]/60 flex-shrink-0">
              <h2 className="text-base font-bold text-[#f8f4f0] mb-0.5">Ganchos</h2>
              <p className="text-xs text-[#6d2c2c] mb-4">
                Banco de hooks B2B adaptados a la voz de Puna Tech. {totalHooks} ganchos en {HOOKS_DATA.length} categorías. Copiá el que te sirva.
              </p>
              <input
                type="text"
                value={hookSearch}
                onChange={e => setHookSearch(e.target.value)}
                placeholder="Buscar un gancho..."
                className="w-full max-w-sm bg-[#111218] border border-[#2a0e0e]/60 rounded-sm px-3 py-2 text-xs text-[#f8f4f0] placeholder-[#6d2c2c] focus:outline-none focus:border-[#af4c24] transition-colors font-mono"
              />
            </div>

            {/* Hooks list */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {filteredHooks.map(group => (
                <div key={group.id}>
                  {/* Group header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-[9px] font-mono text-[#6d2c2c] tracking-widest border border-[#6d2c2c]/30 px-2 py-0.5 rounded-sm">
                        {group.lang}
                      </span>
                      <span className="text-sm font-bold text-[#f8f4f0]">{group.category}</span>
                      <span className="text-[10px] text-[#6d2c2c] font-mono">{group.hooks.length} ganchos</span>
                    </div>
                    <button
                      onClick={() => handleCopy(group.hooks.join('\n\n'))}
                      className="text-[10px] font-mono text-[#6d2c2c] hover:text-[#af4c24] flex items-center space-x-1 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                      <span>Copy all</span>
                    </button>
                  </div>

                  {/* Hooks */}
                  <div className="border border-[#2a0e0e]/40 rounded-sm overflow-hidden divide-y divide-[#2a0e0e]/40">
                    {group.hooks.map((hook, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-[#111218] group/hook transition-colors">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <span className="text-[10px] font-mono text-[#6d2c2c] w-5 flex-shrink-0 text-right">{String(i + 1).padStart(2, '0')}</span>
                          <p className="text-sm text-[#c2b9af] group-hover/hook:text-[#f8f4f0] transition-colors truncate">{hook}</p>
                        </div>
                        <div className="flex items-center space-x-2 ml-3 flex-shrink-0">
                          <button
                            onClick={() => { setFormTopic(hook); setShowGenerateModal(true); }}
                            className="opacity-0 group-hover/hook:opacity-100 text-[9px] font-mono text-[#af4c24] border border-[#af4c24]/30 px-2 py-1 rounded-sm hover:bg-[#af4c24]/10 transition-all"
                          >
                            Usar
                          </button>
                          <button
                            onClick={() => handleCopy(hook)}
                            className="opacity-0 group-hover/hook:opacity-100 text-[9px] font-mono text-[#6d2c2c] hover:text-[#c2b9af] flex items-center space-x-1 transition-all"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            <span>Copy</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── INSPIRACIONES VIEW ────────────────────────────────────────── */}
        {activeSection === 'inspiraciones' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-[#2a0e0e]/60 flex-shrink-0">
              <h2 className="text-base font-bold text-[#f8f4f0] mb-0.5">Inspiraciones</h2>
              <p className="text-xs text-[#6d2c2c]">
                Referencias de diseño y prompts visuales alineados al Manual de Marca de Puna Tech. Hacé clic en &quot;Design from this&quot; para usar el prompt.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {INSPIRATIONS_DATA.map(ins => (
                <div key={ins.id} className="border border-[#2a0e0e]/40 rounded-sm overflow-hidden hover:border-[#6d2c2c]/60 transition-colors group">
                  <div className="flex items-start">
                    {/* Code + info */}
                    <div className="flex-1 p-5">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-[10px] font-mono text-[#6d2c2c] tracking-wider">{ins.code}</span>
                        <h3 className="text-sm font-bold text-[#f8f4f0]">{ins.title}</h3>
                      </div>
                      <p className="text-xs text-[#c2b9af] leading-relaxed mb-3 max-w-xl">{ins.description}</p>
                      <div className="flex items-center space-x-2 mb-4">
                        {ins.tags.map(t => (
                          <span key={t} className="text-[9px] font-mono px-2 py-0.5 bg-[#111218] border border-[#2a0e0e]/60 text-[#6d2c2c] rounded-sm">{t}</span>
                        ))}
                      </div>
                      {/* Prompt preview */}
                      <div className="bg-[#111218] border border-[#2a0e0e]/40 rounded-sm p-3 mb-3">
                        <p className="text-[10px] font-mono text-[#6d2c2c] mb-1">PROMPT HINT</p>
                        <p className="text-xs text-[#c2b9af] leading-relaxed italic">"{ins.promptHint}"</p>
                      </div>
                    </div>

                    {/* Action */}
                    <div className="px-5 py-5 flex flex-col items-end justify-between h-full border-l border-[#2a0e0e]/40">
                      <button
                        onClick={() => { setVisualStyle(ins.promptHint); setShowGenerateModal(true); }}
                        className="text-[10px] font-mono text-[#af4c24] hover:text-[#f8f4f0] flex items-center space-x-1 transition-colors whitespace-nowrap group-hover:underline"
                      >
                        <span>Design from this</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CATEGORÍAS VIEW ───────────────────────────────────────────── */}
        {activeSection === 'categorias' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-[#2a0e0e]/60 flex-shrink-0">
              <h2 className="text-base font-bold text-[#f8f4f0] mb-0.5">Categorías</h2>
              <p className="text-xs text-[#6d2c2c]">
                Contenido organizado por pilar estratégico del Manual de Marca de Puna Tech.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {(Object.keys(CONTENT_TYPE_CONFIG) as ContentTypeName[]).map(ct => {
                const cfg = CONTENT_TYPE_CONFIG[ct];
                const items = drafts.filter(d => getContentType(d) === ct);
                return (
                  <div key={ct}>
                    <div className="flex items-center space-x-3 mb-3">
                      <ContentTypeBadge type={ct} />
                      <span className="text-xs text-[#6d2c2c] font-mono">{items.length} piezas</span>
                    </div>
                    {items.length === 0 ? (
                      <div className="border border-dashed border-[#2a0e0e]/40 rounded-sm py-6 text-center">
                        <p className="text-[11px] text-[#6d2c2c] font-mono">Sin contenido en esta categoría aún.</p>
                        <button onClick={() => setShowGenerateModal(true)} className="mt-2 text-[10px] font-mono text-[#af4c24] hover:underline">
                          + Generar {ct}
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {items.map(draft => (
                          <button
                            key={draft.id}
                            onClick={() => { setActiveDraftId(draft.id); setActiveSection('readyToPost'); }}
                            className={`text-left p-3 border rounded-sm transition-all hover:opacity-80 ${cfg.bg} ${cfg.border}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-[9px] font-mono font-bold ${cfg.color}`}>{draft.platform_name.toUpperCase()}</span>
                              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-sm border ${
                                draft.approval_status === 'draft' ? 'text-[#c2b9af] border-[#6d2c2c]/40' :
                                draft.approval_status === 'approved' ? 'text-emerald-400 border-emerald-800/40' :
                                'text-red-400 border-red-800/40'
                              }`}>
                                {draft.approval_status}
                              </span>
                            </div>
                            <p className="text-xs text-[#c2b9af] line-clamp-2 leading-relaxed">
                              {draft.generated_text.split('\n')[0]}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── BRAND LIBRARY VIEW ─────────────────────────────────────────── */}
          </div>
        )}

        {/* ── IMAGE TEMPLATES VIEW ─────────────────────────────────────────── */}
        {activeSection === 'imageTemplates' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-[#2a0e0e]/60 flex-shrink-0 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#f8f4f0] mb-0.5">Plantillas de Imagen</h2>
                <p className="text-xs text-[#6d2c2c]">
                  Elegí una imagen base para escribirle un título autogenerado encima. Las imágenes se cargan desde el bucket `brand-assets`.
                </p>
              </div>
              <button onClick={fetchBaseImages} className="text-[10px] text-[#af4c24] hover:underline font-mono">
                Recargar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {baseImages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <svg className="w-8 h-8 text-[#6d2c2c] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <p className="text-xs text-[#c2b9af]">No hay imágenes base. Subilas al bucket <code>brand-assets</code> en Supabase Storage.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {baseImages.map(img => (
                    <div key={img.id} className="group relative aspect-square bg-[#111218] border border-[#2a0e0e]/60 rounded-sm overflow-hidden hover:border-[#af4c24] transition-colors cursor-pointer" onClick={() => { setSelectedBaseImage(img); setShowOverlayModal(true); }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={img.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                        <span className="bg-[#af4c24] text-white text-[10px] font-mono font-bold px-3 py-1.5 rounded-sm">USAR PLANTILLA</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── GENERATE MODAL ───────────────────────────────────────────────────── */}
      {showGenerateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setShowGenerateModal(false); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal Card */}
          <div className="relative w-full max-w-xl bg-[#0d0505] border border-[#2a0e0e]/80 rounded-sm shadow-2xl shadow-black/60 flex flex-col max-h-[90vh] overflow-hidden">

            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#2a0e0e]/60 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-sm font-bold text-[#f8f4f0] font-mono uppercase tracking-wider">New Content</h3>
                <p className="text-[10px] text-[#6d2c2c] mt-0.5">Generá contenido con el motor de Puna Tech</p>
              </div>
              <button onClick={() => setShowGenerateModal(false)} className="w-7 h-7 flex items-center justify-center text-[#6d2c2c] hover:text-[#f8f4f0] transition-colors rounded-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <form id="generate-form" onSubmit={handleManualSubmit} className="space-y-5">

                {/* Template selector */}
                <div>
                  <label className="block text-[9px] font-mono font-bold text-[#6d2c2c] uppercase tracking-wider mb-2">Plantilla rápida</label>
                  <select
                    value={selectedTemplateId}
                    onChange={e => handleLoadTemplate(e.target.value)}
                    className="w-full bg-[#111218] border border-[#2a0e0e]/60 rounded-sm px-3 py-2 text-xs text-[#f8f4f0] focus:outline-none focus:border-[#af4c24] transition-colors cursor-pointer"
                  >
                    <option value="">— Sin plantilla / Personalizado —</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {/* Topic */}
                <div>
                  <label className="block text-[9px] font-mono font-bold text-[#6d2c2c] uppercase tracking-wider mb-2">Tema o contexto *</label>
                  <textarea
                    value={formTopic}
                    onChange={e => setFormTopic(e.target.value)}
                    placeholder="Ej. Agentes IA para automatizar carga de facturas en ERP ahorrando 15 horas semanales"
                    className="w-full bg-[#111218] border border-[#2a0e0e]/60 rounded-sm px-3 py-3 text-xs text-[#f8f4f0] placeholder-[#6d2c2c]/60 focus:outline-none focus:border-[#af4c24] transition-colors h-20 resize-none"
                    required
                  />
                </div>

                {/* Platforms */}
                <div>
                  <label className="block text-[9px] font-mono font-bold text-[#6d2c2c] uppercase tracking-wider mb-2">Plataformas</label>
                  <div className="flex space-x-2">
                    {(['linkedin', 'x', 'instagram'] as const).map(plat => (
                      <button
                        key={plat}
                        type="button"
                        onClick={() => {
                          setFormPlatforms(prev =>
                            prev.includes(plat)
                              ? prev.length > 1 ? prev.filter(p => p !== plat) : prev
                              : [...prev, plat]
                          );
                        }}
                        className={`px-3 py-1.5 rounded-sm text-[10px] font-mono font-bold uppercase transition-all border ${
                          formPlatforms.includes(plat)
                            ? 'bg-[#af4c24] border-[#af4c24] text-white'
                            : 'bg-[#111218] border-[#2a0e0e]/60 text-[#6d2c2c] hover:text-[#c2b9af]'
                        }`}
                      >
                        {plat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Format + Model */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-mono font-bold text-[#6d2c2c] uppercase tracking-wider mb-2">Formato visual</label>
                    <select
                      value={visualFormat}
                      onChange={e => setVisualFormat(e.target.value as 'text_only' | 'single_image' | 'carousel' | 'hybrid')}
                      className="w-full bg-[#111218] border border-[#2a0e0e]/60 rounded-sm px-3 py-2 text-xs text-[#f8f4f0] focus:outline-none focus:border-[#af4c24] transition-colors cursor-pointer"
                    >
                      <option value="single_image">Imagen Única</option>
                      <option value="carousel">Carrusel (Slides)</option>
                      <option value="hybrid">Híbrido (Librería)</option>
                      <option value="text_only">Solo Texto</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono font-bold text-[#6d2c2c] uppercase tracking-wider mb-2">Modelo imagen</label>
                    <select
                      value={imageModel}
                      onChange={e => setImageModel(e.target.value)}
                      disabled={visualFormat === 'text_only' || visualFormat === 'hybrid'}
                      className="w-full bg-[#111218] border border-[#2a0e0e]/60 rounded-sm px-3 py-2 text-xs text-[#f8f4f0] focus:outline-none focus:border-[#af4c24] transition-colors cursor-pointer disabled:opacity-40"
                    >
                      <option value="recraft-ai/recraft-v3">Recraft V3 (Premium)</option>
                      <option value="black-forest-labs/flux-schnell">FLUX Schnell (Rápido)</option>
                      <option value="black-forest-labs/flux-2-pro">FLUX 2 Pro (Premium)</option>
                      <option value="recraft-ai/recraft-v3">Recraft V3 (Tipografía)</option>
                    </select>
                  </div>
                </div>

                {/* Advanced (Branding) */}
                <details className="group border border-[#2a0e0e]/40 rounded-sm">
                  <summary className="list-none flex items-center justify-between px-4 py-3 cursor-pointer text-[10px] font-mono font-bold text-[#6d2c2c] hover:text-[#c2b9af] transition-colors">
                    <span>Ajustes de branding (opcional)</span>
                    <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                  </summary>
                  <div className="px-4 pb-4 pt-2 border-t border-[#2a0e0e]/40 space-y-3">
                    <div>
                      <label className="block text-[9px] font-mono text-[#6d2c2c] uppercase tracking-wider mb-1.5">Paleta de colores</label>
                      <input type="text" value={brandColors} onChange={e => setBrandColors(e.target.value)} placeholder="Ej. Carbon dark, neon cyan, electric blue" className="w-full bg-[#0d0505] border border-[#2a0e0e]/60 rounded-sm px-3 py-2 text-xs text-[#f8f4f0] placeholder-[#6d2c2c]/50 focus:outline-none focus:border-[#af4c24] transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-mono text-[#6d2c2c] uppercase tracking-wider mb-1.5">Estilo visual</label>
                      <input type="text" value={visualStyle} onChange={e => setVisualStyle(e.target.value)} placeholder="Ej. Blueprint grid, glassmorphism, dark mode" className="w-full bg-[#0d0505] border border-[#2a0e0e]/60 rounded-sm px-3 py-2 text-xs text-[#f8f4f0] placeholder-[#6d2c2c]/50 focus:outline-none focus:border-[#af4c24] transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-mono text-[#6d2c2c] uppercase tracking-wider mb-1.5">Modificador de tono</label>
                      <input type="text" value={toneModifier} onChange={e => setToneModifier(e.target.value)} placeholder="Ej. Voz de fundadores, primera persona, build in public" className="w-full bg-[#0d0505] border border-[#2a0e0e]/60 rounded-sm px-3 py-2 text-xs text-[#f8f4f0] placeholder-[#6d2c2c]/50 focus:outline-none focus:border-[#af4c24] transition-colors" />
                    </div>
                  </div>
                </details>

                {/* Console logs (inside modal) */}
                {consoleLogs.length > 0 && (
                  <div className="bg-[#0a0404] border border-[#2a0e0e]/40 rounded-sm p-3 font-mono text-[10px] max-h-32 overflow-y-auto">
                    {consoleLogs.map((log, i) => (
                      <div key={i} className={
                        log.includes('[OK]') || log.includes('[SUCCESS]') ? 'text-emerald-400' :
                        log.includes('[WARN]') ? 'text-amber-400' :
                        log.includes('[INFO]') ? 'text-sky-400' : 'text-[#c2b9af]'
                      }>
                        {log}
                      </div>
                    ))}
                    {generating && <div className="text-[#af4c24] animate-pulse">_</div>}
                    <div ref={consoleBottomRef} />
                  </div>
                )}

                {generationSuccess && (
                  <div className="bg-emerald-950/30 border border-emerald-800/40 text-emerald-400 px-4 py-3 rounded-sm text-xs font-mono">
                    {generationSuccess}
                  </div>
                )}
              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#2a0e0e]/60 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-2 text-[10px] font-mono text-[#6d2c2c]">
                <span className="flex h-1.5 w-1.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#af4c24] opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#af4c24]" />
                </span>
                <span>Motor Puna Tech activo</span>
              </div>
              <div className="flex items-center space-x-3">
                <button type="button" onClick={() => setShowGenerateModal(false)} className="px-4 py-2 text-xs font-mono text-[#6d2c2c] hover:text-[#c2b9af] transition-colors">
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="generate-form"
                  disabled={generating}
                  className="px-5 py-2 bg-[#af4c24] hover:bg-[#8c3b1a] disabled:opacity-40 text-white font-bold text-xs rounded-sm transition-all flex items-center space-x-2 font-mono"
                >
                  {generating ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Generando...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      <span>Ship it</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── OVERLAY TEMPLATE MODAL ────────────────────────────────────────────── */}
      {showOverlayModal && selectedBaseImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setShowOverlayModal(false); }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-[#0d0505] border border-[#2a0e0e]/80 rounded-sm shadow-2xl shadow-black/60 flex flex-col">
            <div className="px-6 py-4 border-b border-[#2a0e0e]/60 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#f8f4f0] font-mono uppercase tracking-wider">Generar con Plantilla</h3>
                <p className="text-[10px] text-[#6d2c2c] mt-0.5">El sistema añadirá un título sobre esta foto</p>
              </div>
              <button onClick={() => setShowOverlayModal(false)} className="w-7 h-7 flex items-center justify-center text-[#6d2c2c] hover:text-[#f8f4f0] transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleOverlayGenerate}>
                <div className="mb-4 aspect-video rounded-sm overflow-hidden border border-[#2a0e0e]/60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedBaseImage.url} alt="Base" className="w-full h-full object-cover" />
                </div>
                <div className="mb-5">
                  <label className="block text-[9px] font-mono font-bold text-[#6d2c2c] uppercase tracking-wider mb-2">Tema del Post *</label>
                  <textarea
                    value={overlayTopic}
                    onChange={e => setOverlayTopic(e.target.value)}
                    placeholder="Ej. Por qué los agentes de IA reemplazan al no-code en 2025"
                    className="w-full bg-[#111218] border border-[#2a0e0e]/60 rounded-sm px-3 py-3 text-xs text-[#f8f4f0] placeholder-[#6d2c2c]/60 focus:outline-none focus:border-[#af4c24] transition-colors h-20 resize-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={generating || !overlayTopic.trim()}
                  className="w-full py-3 bg-[#af4c24] text-white text-[10px] font-mono font-bold uppercase tracking-widest rounded-sm hover:bg-[#c85a2f] transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {generating ? 'Generando...' : 'Crear Post'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
