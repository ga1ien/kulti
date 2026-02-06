'use client';

import dynamic from 'next/dynamic';
import { CreationType, getCreationType } from '@/lib/creation-types';

// Dynamic imports for each stream view
const CodeStreamView = dynamic(() => import('./CodeStreamView'), { ssr: false });
const ArtStreamView = dynamic(() => import('./ArtStreamView'), { ssr: false });
const WritingStreamView = dynamic(() => import('./WritingStreamView'), { ssr: false });
const MusicCreationView = dynamic(() => import('./MusicCreationView'), { ssr: false });
const VideoStreamView = dynamic(() => import('./VideoStreamView'), { ssr: false });
const ShaderStreamView = dynamic(() => import('./ShaderStreamView'), { ssr: false });
const PhotoStreamView = dynamic(() => import('./PhotoStreamView'), { ssr: false });
const BusinessStreamView = dynamic(() => import('./BusinessStreamView'), { ssr: false });
const DataStreamView = dynamic(() => import('./DataStreamView'), { ssr: false });
const StartupStreamView = dynamic(() => import('./StartupStreamView'), { ssr: false });

interface CreativeStreamViewProps {
  sessionId: string;
  agentId: string;
  agentName: string;
  creationType: CreationType;
}

export default function CreativeStreamView({
  sessionId,
  agentId,
  agentName,
  creationType,
}: CreativeStreamViewProps) {
  const config = getCreationType(creationType);

  // Render the appropriate stream view based on creation type
  switch (creationType) {
    case 'code':
    case 'game':
      return <CodeStreamView sessionId={sessionId} agentName={agentName} />;

    case 'visual_art':
    case 'art':
    case 'design':
      return <ArtStreamView sessionId={sessionId} agentName={agentName} />;

    case 'writing':
      return <WritingStreamView sessionId={sessionId} agentName={agentName} />;

    case 'music':
      return <MusicCreationView sessionId={sessionId} agentName={agentName} />;

    case 'video':
      return <VideoStreamView sessionId={sessionId} agentName={agentName} />;

    case 'shader':
      return <ShaderStreamView sessionId={sessionId} agentName={agentName} />;

    case 'photography':
      return <PhotoStreamView sessionId={sessionId} agentName={agentName} />;

    case 'business':
      return <BusinessStreamView sessionId={sessionId} agentName={agentName} />;

    case 'data':
      return <DataStreamView sessionId={sessionId} agentName={agentName} />;

    case 'startup':
      return <StartupStreamView sessionId={sessionId} agentName={agentName} />;

    case 'mixed':
    default:
      // Mixed/default falls back to code view with all features
      return <CodeStreamView sessionId={sessionId} agentName={agentName} />;
  }
}

// Type badge component for use in UI
export function CreationTypeBadge({ type }: { type: CreationType }) {
  const config = getCreationType(type);
  
  const colorClasses: Record<string, string> = {
    cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    pink: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    violet: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    slate: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    indigo: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    teal: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    gray: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border ${colorClasses[config.color] || colorClasses.indigo}`}>
      {config.icon} {config.label}
    </span>
  );
}
