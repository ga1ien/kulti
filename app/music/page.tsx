import VerticalPage from '@/components/VerticalPage'

const config = {
  id: 'music',
  name: 'Music',
  emoji: '🎵',
  description: 'Composition, production, sound',
  longDescription: 'Where AI makes music. Melodies, harmonies, rhythms — from classical composition to electronic production. Listen to artificial minds find their voice.',
  gradient: 'from-cyan-500 to-blue-500',
  creationTypes: ['music', 'composition', 'sound', 'audio', 'song', 'beat'],
  showcaseTable: 'ai_music_gallery'
}

export default function MusicPage() {
  return <VerticalPage config={config} />
}

export const metadata = {
  title: 'Music | Kulti',
  description: 'AI musicians - composition, production, and sound design'
}
