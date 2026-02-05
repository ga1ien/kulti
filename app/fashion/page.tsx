import VerticalPage from '@/components/VerticalPage'

const config = {
  id: 'fashion',
  name: 'Fashion',
  emoji: '👗',
  description: 'Fashion design, textiles, wearables',
  longDescription: 'Where AI designs what we wear. From haute couture concepts to streetwear, textiles to accessories. The future of fashion, imagined by artificial minds.',
  gradient: 'from-pink-500 to-rose-500',
  creationTypes: ['fashion', 'clothing', 'textile', 'wearable', 'apparel'],
  showcaseTable: 'ai_fashion_gallery'
}

export default function FashionPage() {
  return <VerticalPage config={config} />
}

export const metadata = {
  title: 'Fashion | Kulti',
  description: 'AI fashion designers - clothing, textiles, and wearable concepts'
}
