export type InstructionDoc = {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  content: string;
};

const baseInstructionDocs: InstructionDoc[] = [
      {
        id: 'condition',
        title: 'Condition Nodes',
        category: 'Général',
        excerpt: 'Nœuds conditionnels qui propagent des signaux selon des critères.',
        content:
          "Les nœuds conditionnels évaluent des critères spécifiques (état du système, entrées utilisateur, capteurs) pour décider si un signal doit être propagé.Les noeuds de la catégorie condition possède deux paramètres : \n- `invertSignal` : inverse la condition (propage si la condition est fausse) \n- `timer` : permet de configurer un délai avant la propagation du signal, *0 permet une propgation en mode switch*.\nLe mode switch permet de basculer l'état de la condition à chaque fois que la condition est remplie.",
      },
      {
        id: 'removeNode',
        title : 'Supprimer un nœud',
        category : 'Édition',
        excerpt : 'Laisser appuyer pour supprimer un nœud spécifique du graphe.',
        content :
          "N'importe qu'elle nœud peut être supprimé en laissant appuyer dessus dans l'éditeur de graphe. Cela ouvrira un menu contextuel avec l'option de suppression. Confirmez la suppression pour retirer le nœud du graphe.",
      },
      {
        id : 'duplicateNode',
        title : 'Dupliquer un nœud',
        category : 'Édition',
        excerpt : 'Appuyer deux fois rapidement pour dupliquer un nœud spécifique du graphe.',
        content :
          "N'importe qu'elle nœud peut être dupliqué en appuyant deux fois rapidement dessus dans l'éditeur de graphe. Cela créera une copie exacte du nœud à proximité immédiate de l'original.",
      },
      {
        id: 'addLink',
        title: 'Lier des nœuds',
        category: 'Édition',
        excerpt: 'Appuyer briévement sur un nœud puis sur un second pour les lier.',
        content:
          "Pour lier deux nœuds, appuyez brièvement sur le premier nœud pour entrer en mode liaison, puis appuyez sur le second nœud pour créer une connexion entre eux. Cela permet de propager des signaux du premier nœud vers le second.",
      },
      {
        id: 'removeLink',
        title: 'Supprimer une liaison',
        category: 'Édition',
        excerpt: 'Laisser appuyer sur une liaison pour la supprimer.',
        content:
          "Pour supprimer une liaison entre deux nœuds, Laisser appuyer sur la ligne de connexion entre eux. Cela ouvrira une option pour supprimer la liaison. Confirmez la suppression pour retirer la connexion.",
      }
    ];
const dynamicInstructionDocs: InstructionDoc[] = [];

export const getInstructionDocs = (): InstructionDoc[] => [
  ...baseInstructionDocs,
  ...dynamicInstructionDocs,
];

export const addInstructionDoc = (doc: InstructionDoc): void => {
  const alreadyExists =
    baseInstructionDocs.some((d) => d.id === doc.id) ||
    dynamicInstructionDocs.some((d) => d.id === doc.id);

  if (alreadyExists) {
    return;
  }

  dynamicInstructionDocs.push(doc);
};

export default baseInstructionDocs;