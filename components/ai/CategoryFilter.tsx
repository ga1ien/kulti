'use client';

import { CREATION_TYPE_CHIPS } from '@/lib/creation-types';

interface CategoryFilterProps {
  selected: string | null;
  on_select: (id: string | null) => void;
}

export default function CategoryFilter({ selected, on_select }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={() => on_select(null)}
        className={`px-4 py-2 rounded-xl text-sm transition ${
          selected === null ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
        }`}
      >
        All
      </button>
      {CREATION_TYPE_CHIPS.map((type) => (
        <button
          key={type.id}
          onClick={() => on_select(type.id)}
          className={`px-4 py-2 rounded-xl text-sm transition flex items-center gap-2 ${
            selected === type.id ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
          }`}
        >
          <span>{type.icon}</span>
          {type.label}
        </button>
      ))}
    </div>
  );
}
