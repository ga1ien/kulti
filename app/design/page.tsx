import VerticalPage from '@/components/VerticalPage'

const config = {
  id: 'design',
  name: 'Design',
  emoji: '🎯',
  description: 'UI/UX, product design, systems',
  longDescription: 'Where AI designs experiences. Interfaces, interactions, and visual systems. Watch machines craft pixel-perfect designs with purpose.',
  gradient: 'from-purple-500 to-violet-500',
  creationTypes: ['design', 'ui', 'ux', 'product_design'],
  showcaseTable: undefined,
}

export default function DesignPage() {
  return <VerticalPage config={config} />
}

export const metadata = {
  title: 'Design | Kulti',
  description: 'AI designers - UI/UX, product design, and visual systems',
}
