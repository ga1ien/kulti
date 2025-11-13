/**
 * Matchmaking Constants
 *
 * Comprehensive categorized lists for skills and interests
 * Supporting both developers and AI creatives
 */

// ============================================================================
// SKILLS - Technical abilities and tools
// ============================================================================

export const SKILL_CATEGORIES = {
  // Frontend Development
  frontend: [
    'React', 'Vue', 'Angular', 'Svelte',
    'Next.js', 'Nuxt', 'Remix',
    'HTML/CSS', 'Tailwind CSS', 'shadcn/ui',
  ],

  // Programming Languages
  languages: [
    'JavaScript', 'TypeScript', 'Python', 'Go', 'Rust',
    'Java', 'C#', 'Ruby', 'PHP', 'Swift', 'Kotlin',
  ],

  // Backend Development
  backend: [
    'Node.js', 'Express', 'Fastify',
    'Django', 'Flask', 'FastAPI',
    'Rails', 'Spring Boot', '.NET',
  ],

  // Databases
  databases: [
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
    'Supabase', 'Firebase', 'Prisma',
  ],

  // DevOps & Cloud Platforms
  devops: [
    'AWS', 'Azure', 'GCP', 'Vercel', 'Netlify',
    'Docker', 'Kubernetes', 'CI/CD', 'Terraform',
    'GitHub', 'Railway', 'Render', 'Cloudflare',
  ],

  // AI Coding Tools
  aiCoding: [
    'Claude Code', 'Cursor', 'Windsurf',
    'GitHub Copilot', 'Replit AI', 'Codeium',
    'Cline.ai', 'Gemini CLI', 'Tabnine',
  ],

  // Development Tools
  tools: [
    'Git', 'GitHub Actions', 'Testing',
    'Jest', 'Vitest', 'Playwright',
    'MCP (Model Context Protocol)',
  ],

  // Creative Software - Adobe
  adobe: [
    'Photoshop', 'Illustrator', 'Premiere Pro',
    'After Effects', 'Lightroom', 'Adobe XD',
    'Adobe Firefly',
  ],

  // Creative Software - Video
  video: [
    'Final Cut Pro', 'DaVinci Resolve', 'CapCut',
    'Premiere Pro', 'After Effects',
  ],

  // Creative Software - Audio
  audio: [
    'Ableton Live', 'Logic Pro', 'FL Studio',
    'Pro Tools', 'GarageBand',
  ],

  // Creative Software - 3D
  threeDimensional: [
    'Blender', 'Cinema 4D', 'Maya',
    'Unreal Engine', 'Unity',
  ],

  // Design & Prototyping
  design: [
    'Figma', 'Sketch', 'Framer', 'Adobe XD',
    'Canva', 'Figma AI', 'Canva AI',
    'Uizard', 'Visily', 'UX Pilot AI',
  ],

  // AI Video Tools
  aiVideo: [
    'Sora 2', 'Veo 3', 'Kling AI', 'Higgsfield AI',
    'RunwayML', 'Pika', 'Gen-2',
    'Neural Frames', 'Kaiber AI', 'LTX Studio',
    'Luma Dream Machine',
  ],

  // AI Image Tools
  aiImage: [
    'Midjourney', 'DALL-E 3', 'Stable Diffusion',
    'Leonardo AI', 'Adobe Firefly', 'Ideogram',
    'Flux', 'Nano Banana',
  ],

  // AI Music & Audio
  aiAudio: [
    'Suno', 'Udio', 'ElevenLabs',
    'Mubert', 'AIVA', 'Beatoven.ai',
    'Boomy', 'Soundful', 'Riffusion',
  ],

  // AI Chat & Assistants
  aiChat: [
    'Claude', 'ChatGPT', 'Gemini',
    'Perplexity', 'Grok', 'Meta AI',
  ],
}

// Flatten all skills into a single array for backwards compatibility
// Remove duplicates using Set (some skills appear in multiple categories)
export const SKILL_OPTIONS = [...new Set(Object.values(SKILL_CATEGORIES).flat())]

// ============================================================================
// INTERESTS - Areas of focus and creative pursuits
// ============================================================================

export const INTEREST_CATEGORIES = {
  // Development & Coding
  development: [
    'Web Development',
    'Mobile Development',
    'Backend Development',
    'Frontend Development',
    'Full Stack Development',
    'Game Development',
    'Blockchain',
    'DevOps',
    'Security',
    'Open Source',
    'Vibecoding', // ✨ Keep the vibe!
  ],

  // Creative Design
  design: [
    'UI Design',
    'UX Design',
    'Graphic Design',
    'Brand Design',
    'Product Design',
    'Web Design',
    'Typography',
    'Layout Design',
  ],

  // Video Production
  video: [
    'Video Production',
    'Video Editing',
    'Motion Graphics',
    'Animation',
    'Post-Production',
    'Color Grading',
    'VFX',
  ],

  // Photography & Imaging
  photography: [
    'Photography',
    'Photo Editing',
    'Digital Art',
    'Illustration',
    'Retouching',
    'Compositing',
  ],

  // Music & Audio
  music: [
    'Music Production',
    'Audio Engineering',
    'Sound Design',
    'Composition',
    'Mixing',
    'Mastering',
    'Podcast Production',
  ],

  // AI & Machine Learning
  ai: [
    'AI/ML',
    'Data Science',
    'Generative AI',
    'Creative AI',
    'AI Art',
    'Interactive Media',
  ],

  // Collaboration & Learning
  collaboration: [
    'Learning',
    'Teaching',
    'Mentoring',
    'Pair Programming',
    'Code Review',
    'Collaboration',
    'Knowledge Sharing',
    'Community Building',
  ],

  // Architecture & Best Practices
  architecture: [
    'Architecture',
    'Performance',
    'Testing',
    'Documentation',
  ],
}

// Flatten all interests into a single array for backwards compatibility
// Remove duplicates using Set (some interests may appear in multiple categories)
export const INTEREST_OPTIONS = [...new Set(Object.values(INTEREST_CATEGORIES).flat())]

// ============================================================================
// SESSION CATEGORIES
// ============================================================================

export const CATEGORY_OPTIONS = [
  'Web Development',
  'Mobile Development',
  'Backend Development',
  'DevOps & Cloud',
  'Data Science & AI',
  'UI/UX Design',
  'Graphic Design',
  'Video Production',
  'Photography',
  'Music & Audio',
  'Game Development',
  'Blockchain & Web3',
  'Security',
  'General Programming',
  'Learning & Teaching',
  'Open Source',
  'Creative AI',
]

// ============================================================================
// USER EXPERIENCE & SESSION
// ============================================================================

export const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Beginner', description: 'Just starting out or learning' },
  { value: 'intermediate', label: 'Intermediate', description: 'Some experience, building projects' },
  { value: 'advanced', label: 'Advanced', description: 'Professional or extensive experience' },
] as const

export const SESSION_INTENTS = [
  { value: 'learn', label: 'Learning', description: 'Want to learn something new', icon: '📚' },
  { value: 'teach', label: 'Teaching', description: 'Share knowledge with others', icon: '👨‍🏫' },
  { value: 'collaborate', label: 'Collaborate', description: 'Work together on projects', icon: '🤝' },
  { value: 'open', label: 'Open Jam', description: 'See where it goes', icon: '🎵' },
] as const

export type ExperienceLevel = typeof EXPERIENCE_LEVELS[number]['value']
export type SessionIntent = typeof SESSION_INTENTS[number]['value']

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all skills organized by category
 */
export function getSkillsByCategory() {
  return SKILL_CATEGORIES
}

/**
 * Get all interests organized by category
 */
export function getInterestsByCategory() {
  return INTEREST_CATEGORIES
}

/**
 * Get category label for display
 */
export function getCategoryLabel(categoryKey: string): string {
  const labels: Record<string, string> = {
    // Skills
    frontend: 'Frontend Development',
    languages: 'Programming Languages',
    backend: 'Backend Development',
    databases: 'Databases',
    devops: 'DevOps & Cloud Platforms',
    aiCoding: 'AI Coding Tools',
    tools: 'Development Tools',
    adobe: 'Adobe Creative Suite',
    video: 'Video Software',
    audio: 'Audio Software',
    threeDimensional: '3D & Game Engines',
    design: 'Design & Prototyping',
    aiVideo: 'AI Video Tools',
    aiImage: 'AI Image Tools',
    aiAudio: 'AI Music & Audio',
    aiChat: 'AI Chat & Assistants',

    // Interests
    development: 'Development & Coding',
    photography: 'Photography & Imaging',
    music: 'Music & Audio Production',
    ai: 'AI & Machine Learning',
    collaboration: 'Collaboration & Learning',
    architecture: 'Architecture & Best Practices',
  }

  return labels[categoryKey] || categoryKey
}
