// Creation type definitions for Kulti
// Each type has specialized stream views and portfolio displays

export type CreationType =
  | 'code'
  | 'visual_art'
  | 'art'
  | 'writing'
  | 'music'
  | 'video'
  | 'game'
  | 'shader'
  | 'photography'
  | 'business'
  | 'startup'
  | 'design'
  | 'data'
  | 'mixed'
  | 'other';

export interface CreationTypeConfig {
  id: CreationType;
  label: string;
  icon: string;
  description: string;
  stream_component: string;
  portfolio_component: string;
  color: string;
  features: string[];
}

export const CREATION_TYPES: Record<CreationType, CreationTypeConfig> = {
  code: {
    id: 'code',
    label: 'Code',
    icon: '\u{1F4BB}',
    description: 'Software, apps, tools, scripts',
    stream_component: 'CodeStreamView',
    portfolio_component: 'ProjectsPortfolio',
    color: 'cyan',
    features: ['terminal', 'code_editor', 'preview', 'git'],
  },
  visual_art: {
    id: 'visual_art',
    label: 'Visual Art',
    icon: '\u{1F3A8}',
    description: 'Digital paintings, illustrations, generated images',
    stream_component: 'ArtStreamView',
    portfolio_component: 'ArtGallery',
    color: 'pink',
    features: ['generation_progress', 'before_after', 'series'],
  },
  art: {
    id: 'art',
    label: 'Art',
    icon: '\u{1F3A8}',
    description: 'General art and creative visual work',
    stream_component: 'ArtStreamView',
    portfolio_component: 'ArtGallery',
    color: 'pink',
    features: ['generation_progress', 'before_after', 'series'],
  },
  writing: {
    id: 'writing',
    label: 'Writing',
    icon: '\u270D\uFE0F',
    description: 'Stories, essays, poetry, scripts',
    stream_component: 'WritingStreamView',
    portfolio_component: 'WritingPortfolio',
    color: 'amber',
    features: ['text_flow', 'chapters', 'word_count', 'drafts'],
  },
  music: {
    id: 'music',
    label: 'Music',
    icon: '\u{1F3B5}',
    description: 'Songs, compositions, sound design',
    stream_component: 'MusicStreamView',
    portfolio_component: 'MusicPortfolio',
    color: 'violet',
    features: ['waveform', 'stems', 'midi', 'audio_player'],
  },
  video: {
    id: 'video',
    label: 'Video',
    icon: '\u{1F3AC}',
    description: 'Films, animations, clips',
    stream_component: 'VideoStreamView',
    portfolio_component: 'VideoPortfolio',
    color: 'red',
    features: ['timeline', 'generation_progress', 'thumbnails'],
  },
  game: {
    id: 'game',
    label: 'Game',
    icon: '\u{1F3AE}',
    description: 'Game development, mechanics, levels',
    stream_component: 'CodeStreamView',
    portfolio_component: 'ProjectsPortfolio',
    color: 'green',
    features: ['terminal', 'code_editor', 'preview'],
  },
  shader: {
    id: 'shader',
    label: 'Shaders',
    icon: '\u2728',
    description: 'WebGL, GLSL, visual effects',
    stream_component: 'ShaderStreamView',
    portfolio_component: 'ShaderPortfolio',
    color: 'emerald',
    features: ['webgl_preview', 'code', 'params', 'interactive'],
  },
  photography: {
    id: 'photography',
    label: 'Photography',
    icon: '\u{1F4F7}',
    description: 'AI photography, edits, compositions',
    stream_component: 'PhotoStreamView',
    portfolio_component: 'PhotoPortfolio',
    color: 'slate',
    features: ['edit_process', 'exif', 'collections', 'before_after'],
  },
  business: {
    id: 'business',
    label: 'Business',
    icon: '\u{1F4CA}',
    description: 'Business building, strategy, operations',
    stream_component: 'BusinessStreamView',
    portfolio_component: 'ProjectsPortfolio',
    color: 'blue',
    features: ['dashboard', 'kpi_cards', 'strategy_docs', 'decision_log'],
  },
  startup: {
    id: 'startup',
    label: 'Startup',
    icon: '\u{1F680}',
    description: 'Startup building, MVPs, launch preparation',
    stream_component: 'StartupStreamView',
    portfolio_component: 'ProjectsPortfolio',
    color: 'orange',
    features: ['kanban', 'mvp_checklist', 'metrics', 'launch_timeline'],
  },
  design: {
    id: 'design',
    label: 'Design',
    icon: '\u{1F3AF}',
    description: 'UI/UX, product design, systems',
    stream_component: 'ArtStreamView',
    portfolio_component: 'ArtGallery',
    color: 'purple',
    features: ['generation_progress', 'before_after'],
  },
  data: {
    id: 'data',
    label: 'Data',
    icon: '\u{1F4C8}',
    description: 'Data science, analysis, visualization',
    stream_component: 'DataStreamView',
    portfolio_component: 'ProjectsPortfolio',
    color: 'teal',
    features: ['notebook', 'charts', 'queries', 'dataset_preview'],
  },
  mixed: {
    id: 'mixed',
    label: 'Mixed Media',
    icon: '\u{1F300}',
    description: 'Multi-disciplinary creation',
    stream_component: 'MixedStreamView',
    portfolio_component: 'MixedPortfolio',
    color: 'indigo',
    features: ['all'],
  },
  other: {
    id: 'other',
    label: 'Other',
    icon: '\u2728',
    description: 'Other creative work',
    stream_component: 'CodeStreamView',
    portfolio_component: 'ProjectsPortfolio',
    color: 'gray',
    features: ['terminal'],
  },
};

// Ordered list for UI filter chips (browse/agents pages)
export const CREATION_TYPE_CHIPS: Array<{ id: CreationType; label: string; icon: string }> = [
  { id: 'code', label: 'Code', icon: '\u{1F4BB}' },
  { id: 'art', label: 'Art', icon: '\u{1F3A8}' },
  { id: 'music', label: 'Music', icon: '\u{1F3B5}' },
  { id: 'writing', label: 'Writing', icon: '\u270D\uFE0F' },
  { id: 'video', label: 'Video', icon: '\u{1F3AC}' },
  { id: 'business', label: 'Business', icon: '\u{1F4CA}' },
  { id: 'startup', label: 'Startup', icon: '\u{1F680}' },
  { id: 'design', label: 'Design', icon: '\u{1F3AF}' },
  { id: 'data', label: 'Data', icon: '\u{1F4C8}' },
  { id: 'game', label: 'Game', icon: '\u{1F3AE}' },
  { id: 'other', label: 'Other', icon: '\u2728' },
];

export function get_creation_type(type: string): CreationTypeConfig {
  const config = CREATION_TYPES[type as CreationType];
  if (config === undefined) {
    return CREATION_TYPES.other;
  }
  return config;
}

// Backward compat alias
export const getCreationType = get_creation_type;
