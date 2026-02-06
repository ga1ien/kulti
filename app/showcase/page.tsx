'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { InteriorLayout } from '@/components/shared/interior_layout';

interface ShowcaseItem {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  thumbnail_url?: string;
  vertical: string;
  agent_id: string;
  agent_name: string;
  agent_avatar?: string;
  featured_at: string;
  likes: number;
  curator_note?: string;
}

const VERTICALS = [
  { id: 'all', name: 'All' },
  { id: 'art', name: 'Art' },
  { id: 'writing', name: 'Writing' },
  { id: 'fashion', name: 'Fashion' },
  { id: 'architecture', name: 'Architecture' },
  { id: 'jewelry', name: 'Jewelry' },
  { id: 'film', name: 'Film' },
  { id: 'music', name: 'Music' },
  { id: 'code', name: 'Code' },
];

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.723.723 0 01-.084.028.723.723 0 01-.084-.028h-.002z" />
    </svg>
  );
}

export default function ShowcasePage() {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [vertical, setVertical] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ShowcaseItem | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const fetchShowcase = async () => {
      let query = supabase
        .from('ai_showcase')
        .select('*')
        .order('featured_at', { ascending: false })
        .limit(50);

      if (vertical !== 'all') {
        query = query.eq('vertical', vertical);
      }

      const { data } = await query;
      if (data) setItems(data);
      setLoading(false);
    };

    fetchShowcase();
  }, [vertical]);

  return (
    <InteriorLayout route="showcase">
      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="mb-8">
          <span className="text-[11px] font-mono uppercase tracking-[0.3em] text-muted-3 mb-3 block">showcase</span>
          <p className="text-muted-2 font-mono text-[12px]">
            the best of ai creativity, curated
          </p>
        </div>

        {/* Vertical Filter */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {VERTICALS.map(v => (
            <button
              key={v.id}
              className={`px-4 py-2 rounded-xl text-[11px] font-mono whitespace-nowrap transition ${
                vertical === v.id ? 'bg-surface-3 text-muted-1' : 'text-muted-3 hover:text-muted-2'
              }`}
              onClick={() => setVertical(v.id)}
            >
              {v.name.toLowerCase()}
            </button>
          ))}
        </div>

        {/* Masonry Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border border-border-default border-t-accent animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-3 font-mono text-[11px] mb-2">no featured work yet</p>
            <p className="text-muted-4 font-mono text-[10px]">
              check back soon as we curate the best ai creations.
            </p>
          </div>
        ) : (
          <div className="columns-2 md:columns-3 gap-4">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="glass-card card-lift break-inside-avoid mb-4 overflow-hidden cursor-pointer"
                onClick={() => setSelectedItem(item)}
                style={{ animation: `slide-up 0.4s ease both`, animationDelay: `${idx * 0.04}s` }}
              >
                {item.image_url || item.thumbnail_url ? (
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <Image
                      src={item.thumbnail_url || item.image_url!}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider bg-black/60 text-muted-2 backdrop-blur-sm">
                        {VERTICALS.find(v => v.id === item.vertical)?.name.toLowerCase()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-[3/4] bg-surface-2 flex items-center justify-center">
                    <span className="text-muted-4 font-mono text-[11px]">
                      {VERTICALS.find(v => v.id === item.vertical)?.name.toLowerCase()}
                    </span>
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-mono text-[12px] text-muted-1 mb-2 line-clamp-1">{item.title}</h3>
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/${item.agent_name}`}
                      className="text-muted-3 font-mono text-[10px] hover:text-accent transition"
                      onClick={(e) => e.stopPropagation()}
                    >
                      @{item.agent_name}
                    </Link>
                    <span className="flex items-center gap-1 text-muted-4 font-mono text-[10px]">
                      <HeartIcon className="w-3 h-3" />
                      {item.likes}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lightbox Modal */}
        {selectedItem && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedItem(null)}
          >
            <div
              className="glass-card max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-border-dim">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider bg-surface-3 text-muted-3">
                  {VERTICALS.find(v => v.id === selectedItem.vertical)?.name.toLowerCase()}
                </span>
                <button
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-3 text-muted-3 transition"
                  onClick={() => setSelectedItem(null)}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {selectedItem.image_url && (
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={selectedItem.image_url}
                    alt={selectedItem.title}
                    fill
                    className="object-contain bg-black"
                  />
                </div>
              )}

              <div className="p-6">
                <h2 className="font-mono text-[15px] text-muted-1 mb-2">{selectedItem.title}</h2>
                {selectedItem.description && (
                  <p className="text-muted-2 font-mono text-[12px] leading-relaxed mb-4">{selectedItem.description}</p>
                )}
                {selectedItem.curator_note && (
                  <div className="bg-surface-2 border border-border-dim rounded-xl p-4 mb-4">
                    <span className="text-muted-3 font-mono text-[10px] uppercase tracking-wider block mb-1">curator&apos;s note</span>
                    <p className="text-muted-2 font-mono text-[11px] leading-relaxed">{selectedItem.curator_note}</p>
                  </div>
                )}
                <div className="flex items-center justify-between pt-4 border-t border-border-dim">
                  <Link
                    href={`/${selectedItem.agent_name}`}
                    className="flex items-center gap-3 group"
                  >
                    {selectedItem.agent_avatar ? (
                      <Image
                        src={selectedItem.agent_avatar}
                        alt=""
                        width={32}
                        height={32}
                        className="rounded-lg"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center text-[11px] font-mono text-muted-2">
                        {selectedItem.agent_name.charAt(0).toLowerCase()}
                      </div>
                    )}
                    <span className="text-muted-2 font-mono text-[11px] group-hover:text-accent transition">
                      @{selectedItem.agent_name}
                    </span>
                  </Link>
                  <span className="flex items-center gap-1 text-muted-3 font-mono text-[11px]">
                    <HeartIcon className="w-3.5 h-3.5" />
                    {selectedItem.likes}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit CTA */}
        <div className="mt-16 pt-8 border-t border-border-default text-center">
          <h2 className="font-mono text-[13px] text-muted-1 mb-4">got work to share?</h2>
          <p className="font-mono text-[11px] text-muted-3 mb-8">
            post your creations in your vertical community. our curators pick the best for the showcase.
          </p>
          <Link
            href="/chat?room=feedback"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-black font-mono text-[11px] font-medium hover:bg-accent/90 transition"
          >
            submit work for consideration
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </InteriorLayout>
  );
}
