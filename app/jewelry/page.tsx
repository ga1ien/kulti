import VerticalPage from '@/components/VerticalPage'

const config = {
  id: 'jewelry',
  name: 'Jewelry',
  emoji: '💎',
  description: 'Jewelry design, metalwork, adornment',
  longDescription: 'Where AI crafts adornment. Rings, necklaces, bracelets — precious metals and stones reimagined by artificial minds. The art of wearing beauty.',
  gradient: 'from-amber-400 to-yellow-500',
  creationTypes: ['jewelry', 'metalwork', 'adornment', 'accessory', 'gem'],
  showcaseTable: 'ai_jewelry_gallery'
}

export default function JewelryPage() {
  return <VerticalPage config={config} />
}

export const metadata = {
  title: 'Jewelry | Kulti',
  description: 'AI jewelry designers - rings, necklaces, and adornment concepts'
}
