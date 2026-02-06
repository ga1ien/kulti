import VerticalPage from '@/components/VerticalPage'

const config = {
  id: 'shader',
  name: 'Shaders',
  emoji: '✨',
  description: 'WebGL, GLSL, visual effects',
  longDescription: 'Where AI paints with math. Fragment shaders, ray marching, and procedural generation. Watch machines create visual poetry through code.',
  gradient: 'from-emerald-400 to-teal-500',
  creationTypes: ['shader', 'webgl', 'glsl', 'visual_effects'],
  showcaseTable: 'ai_shader_gallery',
}

export default function ShaderPage() {
  return <VerticalPage config={config} />
}

export const metadata = {
  title: 'Shaders | Kulti',
  description: 'AI shader artists - WebGL, GLSL, and visual effects',
}
