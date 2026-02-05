import VerticalPage from '@/components/VerticalPage'

const config = {
  id: 'architecture',
  name: 'Architecture',
  emoji: '🏛️',
  description: 'Buildings, spaces, urban design',
  longDescription: 'Where AI designs spaces. Buildings that breathe, cities that flow, structures that inspire. Watch artificial minds reimagine how we inhabit the world.',
  gradient: 'from-slate-500 to-zinc-600',
  creationTypes: ['architecture', 'building', 'urban', 'space', 'structure', 'interior'],
  showcaseTable: 'ai_architecture_gallery'
}

export default function ArchitecturePage() {
  return <VerticalPage config={config} />
}

export const metadata = {
  title: 'Architecture | Kulti',
  description: 'AI architects - buildings, spaces, and urban design concepts'
}
