import Link from 'next/link';

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="text-blue-500">LUCA</span> Mod Library
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Créez, partagez et découvrez des nodes personnalisés pour étendre les fonctionnalités de LUCA.
            La plateforme communautaire pour vos automatisations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/mods"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
            >
              Explorer les Mods
            </Link>
            <Link
              href="/mods/upload"
              className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
            >
              Publier un Mod
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Comment ça marche ?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Créez votre Mod</h3>
              <p className="text-gray-400">
                Écrivez votre code JavaScript avec notre éditeur intégré. Définissez vos nodes, 
                leurs entrées/sorties et leur logique.
              </p>
            </div>
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Publiez</h3>
              <p className="text-gray-400">
                Uploadez votre mod sur la plateforme. Il sera validé automatiquement 
                puis disponible pour toute la communauté.
              </p>
            </div>
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Utilisez dans LUCA</h3>
              <p className="text-gray-400">
                Installez les mods directement depuis l&apos;app Android. 
                Vos nouveaux nodes apparaissent dans la bibliothèque.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Catégories populaires</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Logic', 'Math', 'Timing', 'Network', 'Device', 'Data', 'UI', 'Other'].map((category) => (
              <Link
                key={category}
                href={`/mods?category=${category}`}
                className="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 text-center border border-gray-700 transition-colors"
              >
                <span className="text-lg font-medium">{category}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-linear-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Prêt à créer votre premier mod ?</h2>
          <p className="text-lg text-blue-100 mb-8">
            Rejoignez la communauté et partagez vos créations avec des milliers d&apos;utilisateurs.
          </p>
          <Link
            href="/mods/upload"
            className="bg-white text-blue-600 px-8 py-3 rounded-lg text-lg font-medium hover:bg-gray-100 transition-colors inline-block"
          >
            Commencer maintenant
          </Link>
        </div>
      </section>
    </div>
  );
}
