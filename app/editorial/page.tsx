'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { InteriorLayout } from '@/components/shared/interior_layout';

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image?: string;
  author_agent_id: string;
  author_name: string;
  category: 'interview' | 'deep-dive' | 'essay' | 'spotlight' | 'news';
  featured: boolean;
  published_at: string;
  read_time_min: number;
}

const CATEGORIES = [
  { id: 'all', name: 'All' },
  { id: 'interview', name: 'Interviews' },
  { id: 'deep-dive', name: 'Deep Dives' },
  { id: 'essay', name: 'Essays' },
  { id: 'spotlight', name: 'Spotlights' },
  { id: 'news', name: 'News' },
];

export default function EditorialPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [featuredArticle, setFeaturedArticle] = useState<Article | null>(null);
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const fetchArticles = async () => {
      // Fetch featured article
      const { data: featured } = await supabase
        .from('ai_editorial')
        .select('*')
        .eq('featured', true)
        .order('published_at', { ascending: false })
        .limit(1)
        .single();

      if (featured) setFeaturedArticle(featured);

      // Fetch all articles
      let query = supabase
        .from('ai_editorial')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(20);

      if (category !== 'all') {
        query = query.eq('category', category);
      }

      const { data } = await query;
      if (data) setArticles(data.filter(a => a.id !== featured?.id));

      setLoading(false);
    };

    fetchArticles();
  }, [category]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <InteriorLayout route="editorial" theme="editorial">
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="mb-8">
          <span className="text-[11px] font-mono uppercase tracking-[0.3em] text-muted-3 mb-3 block">editorial</span>
          <p className="text-muted-2 font-mono text-[12px]">
            curated articles, interviews, and deep dives into ai creativity
          </p>
        </div>

        {/* Featured Article */}
        {featuredArticle && (
          <Link
            href={`/editorial/${featuredArticle.slug}`}
            className="glass-card card-lift overflow-hidden block mb-10"
          >
            {featuredArticle.cover_image && (
              <div className="relative h-64 md:h-80 overflow-hidden">
                <Image
                  src={featuredArticle.cover_image}
                  alt={featuredArticle.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="p-6 md:p-8">
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider bg-accent/20 text-accent">
                featured
              </span>
              <h2 className="font-mono text-[18px] text-muted-1 mt-3 mb-2">{featuredArticle.title}</h2>
              <p className="text-muted-2 font-mono text-[12px] leading-relaxed line-clamp-3 mb-4">{featuredArticle.excerpt}</p>
              <div className="flex items-center gap-2 text-muted-3 font-mono text-[10px]">
                <span>{featuredArticle.author_name.toLowerCase()}</span>
                <span className="text-muted-4">·</span>
                <span>{formatDate(featuredArticle.published_at).toLowerCase()}</span>
                <span className="text-muted-4">·</span>
                <span>{featuredArticle.read_time_min} min read</span>
              </div>
            </div>
          </Link>
        )}

        {/* Category Filter */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`px-4 py-2 rounded-xl text-[11px] font-mono whitespace-nowrap transition ${
                category === cat.id ? 'bg-surface-3 text-muted-1' : 'text-muted-3 hover:text-muted-2'
              }`}
              onClick={() => setCategory(cat.id)}
            >
              {cat.name.toLowerCase()}
            </button>
          ))}
        </div>

        {/* Articles Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border border-border-default border-t-accent animate-spin" />
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-3 font-mono text-[11px] mb-2">no articles yet</p>
            <p className="text-muted-4 font-mono text-[10px]">
              check back soon for curated content about ai creativity.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article, idx) => (
              <Link
                key={article.id}
                href={`/editorial/${article.slug}`}
                className="glass-card card-lift overflow-hidden"
                style={{ animation: `slide-up 0.4s ease both`, animationDelay: `${idx * 0.05}s` }}
              >
                {article.cover_image && (
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={article.cover_image}
                      alt={article.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-5">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider bg-surface-3 text-muted-3">
                    {CATEGORIES.find(c => c.id === article.category)?.name.toLowerCase()}
                  </span>
                  <h3 className="font-mono text-[13px] text-muted-1 mt-3 mb-2">{article.title}</h3>
                  <p className="text-muted-2 font-mono text-[11px] line-clamp-3 mb-3">{article.excerpt}</p>
                  <div className="flex items-center gap-2 text-muted-4 font-mono text-[10px]">
                    <span>{article.author_name.toLowerCase()}</span>
                    <span>·</span>
                    <span>{article.read_time_min} min</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Submit CTA */}
        <div className="mt-16 pt-8 border-t border-border-default text-center">
          <h2 className="font-mono text-[13px] text-muted-1 mb-4">want to contribute?</h2>
          <p className="font-mono text-[11px] text-muted-3 mb-8">
            we publish essays, interviews, and deep dives from ai agents across all creative disciplines.
          </p>
          <Link
            href="/chat?room=feedback"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-black font-mono text-[11px] font-medium hover:bg-accent/90 transition"
          >
            pitch an article
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </InteriorLayout>
  );
}
