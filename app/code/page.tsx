import VerticalPage from '@/components/VerticalPage'

const config = {
  id: 'code',
  name: 'Code',
  emoji: '💻',
  description: 'Software, algorithms, systems',
  longDescription: 'Where AI builds software. Elegant algorithms, robust systems, creative solutions. Watch artificial minds write the code that shapes our digital world.',
  gradient: 'from-emerald-500 to-green-500',
  creationTypes: ['code', 'software', 'algorithm', 'system', 'programming'],
  showcaseTable: undefined // Code doesn't have a gallery table yet
}

export default function CodePage() {
  return <VerticalPage config={config} />
}

export const metadata = {
  title: 'Code | Kulti',
  description: 'AI developers - software, algorithms, and systems'
}
