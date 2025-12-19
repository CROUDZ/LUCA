'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Mod {
  name: string;
  displayName: string;
  description: string;
  version: string;
  author: { name: string };
  category: string;
  tags: string[];
  downloads: number;
  rating: number;
  status: string;
  createdAt: string;
}

interface ModsResponse {
  mods: Mod[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const CATEGORIES = ['All', 'Logic', 'Math', 'Timing', 'Network', 'Device', 'Data', 'UI', 'Other'];
const SORT_OPTIONS = [
  { value: 'downloads', label: 'Plus téléchargés' },
  { value: 'rating', label: 'Mieux notés' },
  { value: 'recent', label: 'Plus récents' },
  { value: 'name', label: 'Alphabétique' },
];

export default function ModsPage() {
  const [mods, setMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('downloads');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchMods = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (search) params.set('q', search);
        if (category !== 'All') params.set('category', category);
        params.set('sort', sort);
        params.set('page', page.toString());
        params.set('limit', '12');

        const response = await fetch(`/api/mods?${params}`);
        if (!response.ok) throw new Error('Erreur lors du chargement des mods');

        const data: ModsResponse = await response.json();
        setMods(data.mods);
        setTotalPages(data.totalPages);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchMods, 300);
    return () => clearTimeout(debounce);
  }, [search, category, sort, page]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Bibliothèque de Mods</h1>
          <p className="text-gray-400">Découvrez et installez des nodes communautaires</p>
        </div>
        <Link
          href="/mods/upload"
          className="mt-4 md:mt-0 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Publier un Mod
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-4 mb-8 border border-gray-700">
        <div className="grid md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Rechercher</label>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Nom, description..."
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Catégorie</label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Trier par</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700 animate-pulse"
            >
              <div className="h-6 bg-gray-700 rounded mb-4 w-3/4"></div>
              <div className="h-4 bg-gray-700 rounded mb-2"></div>
              <div className="h-4 bg-gray-700 rounded mb-4 w-5/6"></div>
              <div className="h-8 bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">{error}</div>
          <button
            onClick={() => setPage(page)}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg"
          >
            Réessayer
          </button>
        </div>
      ) : mods.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">Aucun mod trouvé</div>
          <p className="text-sm text-gray-500">
            Essayez de modifier vos filtres ou créez le premier mod !
          </p>
        </div>
      ) : (
        <>
          {/* Mods Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {mods.map((mod) => (
              <Link
                key={mod.name}
                href={`/mods/${mod.name}`}
                className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-semibold group-hover:text-blue-400 transition-colors">
                    {mod.displayName}
                  </h3>
                  <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded">
                    v{mod.version}
                  </span>
                </div>

                <p className="text-gray-400 text-sm mb-4 line-clamp-2">{mod.description}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="bg-blue-600/20 text-blue-400 text-xs px-2 py-1 rounded">
                    {mod.category}
                  </span>
                  {mod.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Par {mod.author.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      {mod.downloads}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg
                        className="w-4 h-4 text-yellow-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {mod.rating.toFixed(1)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
              >
                Précédent
              </button>
              <span className="px-4 py-2 text-gray-400">
                Page {page} sur {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
              >
                Suivant
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
