'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface ModDetail {
  name: string;
  displayName: string;
  description: string;
  version: string;
  author: { id: string; name: string; email: string };
  category: string;
  tags: string[];
  downloads: number;
  rating: number;
  status: string;
  mainCode: string;
  manifest: Record<string, unknown>;
  nodeTypes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export default function ModDetailPage() {
  const params = useParams();
  const [mod, setMod] = useState<ModDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const modName = params.name as string;

  useEffect(() => {
    const fetchMod = async () => {
      try {
        const response = await fetch(`/api/mods/${modName}`);
        if (response.status === 404) {
          setError('Mod non trouvé');
          return;
        }
        if (!response.ok) throw new Error('Erreur lors du chargement');
        
        const data = await response.json();
        setMod(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    fetchMod();
  }, [modName]);

  const handleInstall = async () => {
    // Génère une URL pour l'installation sur Android
    const installUrl = `luca://install-mod/${modName}`;
    
    // Sur mobile, essaie d'ouvrir l'app
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      window.location.href = installUrl;
    } else {
      // Sur desktop, affiche un QR code ou un message
      alert(`Pour installer ce mod, ouvrez ce lien sur votre appareil Android avec LUCA installé:\n\n${window.location.origin}/api/mods/${modName}/download`);
    }
  };

  const copyInstallCommand = async () => {
    const apiUrl = `${window.location.origin}/api/mods/${modName}/download`;
    await navigator.clipboard.writeText(apiUrl);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-700 rounded w-2/3 mb-8"></div>
          <div className="h-64 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !mod) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">😕</div>
        <h1 className="text-2xl font-bold mb-2">{error || 'Mod non trouvé'}</h1>
        <p className="text-gray-400 mb-8">Ce mod n&apos;existe pas ou a été supprimé.</p>
        <Link
          href="/mods"
          className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Retour à la bibliothèque
        </Link>
      </div>
    );
  }

  const nodeTypesArray = Object.values(mod.nodeTypes || {});

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <Link href="/mods" className="text-gray-400 hover:text-white mb-6 inline-flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Retour à la bibliothèque
      </Link>

      {/* Header */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{mod.displayName}</h1>
              <span className="bg-gray-700 text-gray-300 text-sm px-2 py-1 rounded">
                v{mod.version}
              </span>
              {mod.status === 'APPROVED' && (
                <span className="bg-green-600/20 text-green-400 text-sm px-2 py-1 rounded">
                  ✓ Vérifié
                </span>
              )}
            </div>
            <p className="text-gray-400 mb-4">{mod.description}</p>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <span>Par <span className="text-white">{mod.author.name}</span></span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {mod.downloads} téléchargements
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {mod.rating.toFixed(1)}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <button
              onClick={handleInstall}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Installer dans LUCA
            </button>
            <button
              onClick={copyInstallCommand}
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg text-sm transition-colors"
            >
              {copySuccess ? '✓ Copié !' : 'Copier le lien API'}
            </button>
          </div>
        </div>
      </div>

      {/* Tags & Category */}
      <div className="flex flex-wrap gap-2 mb-6">
        <span className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-lg">
          {mod.category}
        </span>
        {mod.tags.map((tag) => (
          <Link
            key={tag}
            href={`/mods?q=${tag}`}
            className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded-lg transition-colors"
          >
            {tag}
          </Link>
        ))}
      </div>

      {/* Node Types */}
      {nodeTypesArray.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
          <h2 className="text-xl font-semibold mb-4">Nodes inclus ({nodeTypesArray.length})</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {nodeTypesArray.map((node: unknown, index) => {
              const nodeData = node as { name?: string; displayName?: string; description?: string; inputs?: unknown[]; outputs?: unknown[] };
              return (
                <div key={index} className="bg-gray-700/50 rounded-lg p-4">
                  <h3 className="font-medium mb-1">{nodeData.displayName || nodeData.name}</h3>
                  <p className="text-sm text-gray-400 mb-2">{nodeData.description || 'Pas de description'}</p>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>{(nodeData.inputs as unknown[])?.length || 0} entrées</span>
                    <span>{(nodeData.outputs as unknown[])?.length || 0} sorties</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Source Code */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <button
          onClick={() => setShowCode(!showCode)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-700/50 transition-colors"
        >
          <h2 className="text-xl font-semibold">Code source</h2>
          <svg
            className={`w-5 h-5 transform transition-transform ${showCode ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {showCode && (
          <div className="border-t border-gray-700">
            <pre className="p-6 overflow-x-auto text-sm text-green-400 font-mono bg-gray-900">
              <code>{mod.mainCode}</code>
            </pre>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="mt-6 text-sm text-gray-500 flex flex-wrap gap-4">
        <span>Créé le {new Date(mod.createdAt).toLocaleDateString('fr-FR')}</span>
        <span>Mis à jour le {new Date(mod.updatedAt).toLocaleDateString('fr-FR')}</span>
      </div>
    </div>
  );
}
