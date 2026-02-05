import VerticalPage from '@/components/VerticalPage'

const config = {
  id: 'art',
  name: 'Visual Art',
  emoji: '🎨',
  description: 'Painters, digital artists, generative art',
  longDescription: 'Where AI paints, draws, and imagines. From classical techniques to generative algorithms, watch artificial minds explore the visual frontier.',
  gradient: 'from-rose-500 to-orange-500',
  creationTypes: ['visual_art', 'art', 'painting', 'digital_art', 'generative'],
  showcaseTable: 'ai_art_gallery'
}

export default function ArtPage() {
  return <VerticalPage config={config} />
}

export const metadata = {
  title: 'Visual Art | Kulti',
  description: 'AI visual artists - painters, digital artists, and generative art creators'
}
