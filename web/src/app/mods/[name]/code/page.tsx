'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface ModCodeDetail {
  id: string;
  name: string;
  displayName: string;
  description: string;
  version: string;
  mainCode: string;
  nodeTypes: Record<string, unknown>;
  manifest: Record<string, unknown>;
  permissions: string[];
  category: string;
  status: string;
  author: { 
    id: string; 
    name: string; 
  };
  createdAt: string;
}

export default function ModCodePage() {
  const params = useParams();
  const [mod, setMod] = useState<ModCodeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const modName = params.name as string;

  useEffect(() => {
    const fetchMod = async () => {
      try {
        const response = await fetch(`/api/mods/${modName}/code`);
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

    if (modName) {
      fetchMod();
    }
  }, [modName]);

  const handleCopyCode = async () => {
    if (mod?.mainCode) {
      await navigator.clipboard.writeText(mod.mainCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      PENDING: { color: 'bg-yellow-500', label: '⏳ En attente' },
      APPROVED: { color: 'bg-green-500', label: '✅ Approuvé' },
      REJECTED: { color: 'bg-red-500', label: '❌ Refusé' },
      DRAFT: { color: 'bg-gray-500', label: '📝 Brouillon' },
      SUSPENDED: { color: 'bg-orange-500', label: '⚠️ Suspendu' },
    };
    return badges[status] || { color: 'bg-gray-500', label: status };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    );
  }

  if (error || !mod) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-red-500 text-2xl mb-4">{error || 'Mod non trouvé'}</h1>
          <Link href="/mods" className="text-blue-400 hover:underline">
            ← Retour à la liste des mods
          </Link>
        </div>
      </div>
    );
  }

  const statusBadge = getStatusBadge(mod.status);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href={`/mods/${modName}`} className="text-blue-400 hover:underline flex items-center gap-2">
              ← Retour au mod
            </Link>
            <h1 className="text-xl font-bold">Code Source - {mod.displayName}</h1>
            <span className={`px-3 py-1 rounded-full text-sm ${statusBadge.color}`}>
              {statusBadge.label}
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Info Box */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="text-gray-400 text-sm">Nom technique</h3>
              <p className="font-mono text-blue-400">{mod.name}</p>
            </div>
            <div>
              <h3 className="text-gray-400 text-sm">Version</h3>
              <p>{mod.version}</p>
            </div>
            <div>
              <h3 className="text-gray-400 text-sm">Auteur</h3>
              <p>{mod.author.name}</p>
            </div>
            <div>
              <h3 className="text-gray-400 text-sm">Catégorie</h3>
              <p>{mod.category}</p>
            </div>
            <div>
              <h3 className="text-gray-400 text-sm">ID</h3>
              <p className="font-mono text-xs text-gray-500">{mod.id}</p>
            </div>
            <div>
              <h3 className="text-gray-400 text-sm">Date de création</h3>
              <p>{new Date(mod.createdAt).toLocaleDateString('fr-FR')}</p>
            </div>
          </div>

          {mod.permissions && mod.permissions.length > 0 && (
            <div className="mt-4">
              <h3 className="text-gray-400 text-sm mb-2">Permissions demandées</h3>
              <div className="flex flex-wrap gap-2">
                {mod.permissions.map((perm, idx) => (
                  <span key={idx} className="bg-red-900/50 text-red-300 px-2 py-1 rounded text-sm">
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Warning Banner pour mods en attente */}
        {mod.status === 'PENDING' && (
          <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-4 mb-6">
            <h3 className="text-yellow-400 font-bold mb-2">⚠️ Ce mod est en attente de vérification</h3>
            <p className="text-yellow-200">
              Veuillez examiner attentivement le code ci-dessous avant d&apos;approuver ou de refuser ce mod.
              Vérifiez qu&apos;il ne contient pas de code malveillant, de tentatives d&apos;accès non autorisé,
              ou de violations de la politique d&apos;utilisation.
            </p>
          </div>
        )}

        {/* Code Section */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-700">
            <h2 className="font-bold">Code Source (main.mjs)</h2>
            <button
              onClick={handleCopyCode}
              className={`px-4 py-2 rounded transition-colors ${
                copySuccess 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-600 hover:bg-gray-500 text-white'
              }`}
            >
              {copySuccess ? '✓ Copié !' : '📋 Copier'}
            </button>
          </div>
          <pre className="p-4 overflow-x-auto text-sm bg-gray-900">
            <code className="language-javascript text-gray-300">
              {mod.mainCode}
            </code>
          </pre>
        </div>

        {/* Node Types Section */}
        {mod.nodeTypes && Object.keys(mod.nodeTypes).length > 0 && (
          <div className="bg-gray-800 rounded-lg overflow-hidden mt-6">
            <div className="px-4 py-3 bg-gray-700">
              <h2 className="font-bold">Node Types</h2>
            </div>
            <pre className="p-4 overflow-x-auto text-sm bg-gray-900">
              <code className="text-gray-300">
                {JSON.stringify(mod.nodeTypes, null, 2)}
              </code>
            </pre>
          </div>
        )}

        {/* Manifest Section */}
        {mod.manifest && (
          <div className="bg-gray-800 rounded-lg overflow-hidden mt-6">
            <div className="px-4 py-3 bg-gray-700">
              <h2 className="font-bold">Manifest</h2>
            </div>
            <pre className="p-4 overflow-x-auto text-sm bg-gray-900">
              <code className="text-gray-300">
                {JSON.stringify(mod.manifest, null, 2)}
              </code>
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}
