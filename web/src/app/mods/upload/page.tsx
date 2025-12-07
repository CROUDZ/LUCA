'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const CATEGORIES = ['Logic', 'Math', 'Timing', 'Network', 'Device', 'Data', 'UI', 'Other'];

const DEFAULT_CODE = `// Exemple de mod LUCA
// Définissez vos nodes personnalisés ici

export const nodeTypes = {
  'my-custom-node': {
    name: 'my-custom-node',
    displayName: 'Mon Node Custom',
    description: 'Description de mon node',
    category: 'custom',
    inputs: [
      { id: 'signal', type: 'signal', label: 'Signal' },
      { id: 'value', type: 'number', label: 'Valeur' }
    ],
    outputs: [
      { id: 'result', type: 'signal', label: 'Résultat' }
    ],
    defaultConfig: {
      multiplier: 2
    }
  }
};

// Fonction d'exécution du node
export function execute(nodeType, inputs, config, context) {
  if (nodeType === 'my-custom-node') {
    const value = inputs.value || 0;
    const result = value * (config.multiplier || 1);
    return { result };
  }
  return {};
}

// Métadonnées du mod (optionnel, sera généré automatiquement si absent)
export const manifest = {
  name: 'my-mod',
  displayName: 'Mon Premier Mod',
  description: 'Un mod exemple pour LUCA',
  version: '1.0.0',
  author: 'Anonyme',
  category: 'Other'
};
`;

interface FormData {
  name: string;
  displayName: string;
  description: string;
  version: string;
  category: string;
  tags: string;
  code: string;
}

interface NodeIO { id: string; type: string; label?: string }
interface NodeDescriptor {
  name: string;
  displayName?: string;
  description?: string;
  category?: string;
  inputs?: NodeIO[];
  outputs?: NodeIO[];
  defaultConfig?: Record<string, unknown>;
}

export default function UploadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    displayName: '',
    description: '',
    version: '1.0.0',
    category: 'Other',
    tags: '',
    code: DEFAULT_CODE,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generateName = (displayName: string) => {
    return displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validation basique
      if (!formData.displayName.trim()) {
        throw new Error('Le nom d\'affichage est requis');
      }
      if (!formData.description.trim()) {
        throw new Error('La description est requise');
      }
      if (!formData.code.trim()) {
        throw new Error('Le code est requis');
      }

      const name = formData.name || generateName(formData.displayName);
      const tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);

      // Parse le code pour extraire nodeTypes si présent
      let nodeTypes: Record<string, NodeDescriptor> = {};
      try {
        // Extraction via regex améliorée
        const nodeTypesMatch = formData.code.match(/export\s+const\s+nodeTypes\s*=\s*(\{[\s\S]*?\n\});/);
        if (nodeTypesMatch && nodeTypesMatch[1]) {
          // Essayer d'évaluer l'objet (avec prudence)
          try {
            const extractedTypes = new Function(`return ${nodeTypesMatch[1]}`)();
            if (typeof extractedTypes === 'object' && extractedTypes !== null) {
              nodeTypes = extractedTypes;
            }
          } catch {
            // Si l'évaluation échoue, on crée un nodeType par défaut basé sur le nom
            console.warn('Could not parse nodeTypes, using default');
          }
        }
      } catch {
        // Ignore parsing errors
      }

      // Si aucun nodeType n'a été extrait, créer un node par défaut
      if (Object.keys(nodeTypes).length === 0) {
        const nodeId = name.replace(/-/g, '_');
        nodeTypes = {
          [nodeId]: {
            name: nodeId,
            displayName: formData.displayName,
            description: formData.description,
            category: formData.category,
            inputs: [
              { id: 'signal', type: 'signal', label: 'Signal' }
            ],
            outputs: [
              { id: 'result', type: 'signal', label: 'Résultat' }
            ],
            defaultConfig: {}
          }
        };
      }

      const payload = {
        name,
        displayName: formData.displayName,
        description: formData.description,
        version: formData.version,
        category: formData.category,
        tags,
        mainCode: formData.code,
        nodeTypes,
        manifest: {
          name,
          displayName: formData.displayName,
          description: formData.description,
          version: formData.version,
          author: 'Anonymous', // TODO: Use authenticated user
          category: formData.category,
          tags,
          lucaVersion: '>=1.0.0',
          permissions: [],
        },
      };

      const response = await fetch('/api/mods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la publication');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/mods/${name}`);
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-green-600/20 border border-green-500 rounded-xl p-8">
          <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <h2 className="text-2xl font-bold mb-2">Mod publié avec succès !</h2>
          <p className="text-gray-400">Redirection vers la page du mod...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/mods" className="text-gray-400 hover:text-white mb-4 inline-flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Retour à la bibliothèque
        </Link>
        <h1 className="text-3xl font-bold mt-4">Publier un nouveau Mod</h1>
        <p className="text-gray-400 mt-2">Partagez vos nodes personnalisés avec la communauté LUCA</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-600/20 border border-red-500 rounded-lg p-4 text-red-400">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Informations générales</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Nom d&apos;affichage *
              </label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="Mon Super Mod"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Identifiant unique (optionnel)
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={generateName(formData.displayName) || 'mon-super-mod'}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Sera généré automatiquement si vide</p>
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Décrivez ce que fait votre mod..."
              rows={3}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              required
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Version</label>
              <input
                type="text"
                name="version"
                value={formData.version}
                onChange={handleChange}
                placeholder="1.0.0"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Catégorie</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Tags</label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="timer, utility, helper"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Séparés par des virgules</p>
            </div>
          </div>
        </div>

        {/* Code Editor */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Code du Mod</h2>
            <span className="text-sm text-gray-400">JavaScript / ESM</span>
          </div>
          <div className="relative">
            <textarea
              name="code"
              value={formData.code}
              onChange={handleChange}
              rows={20}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-green-400 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              style={{ tabSize: 2 }}
              spellCheck={false}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Exportez <code className="text-blue-400">nodeTypes</code> et <code className="text-blue-400">execute</code> pour définir vos nodes.
            Consultez la <Link href="/docs" className="text-blue-400 hover:underline">documentation</Link> pour plus d&apos;informations.
          </p>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link
            href="/mods"
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors inline-flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Publication...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Publier le Mod
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
