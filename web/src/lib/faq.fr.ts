import type { FaqCategory } from './faq';

/**
 * Contenu de la FAQ en français. Marque produit : « Plume ».
 * Chaque réponse est découpée en paragraphes (réponse directe, puis détail).
 */
export const FAQ_FR: FaqCategory[] = [
  {
    id: 'comprendre',
    title: 'Comprendre Plume',
    items: [
      {
        q: 'Qu’est-ce que Plume ?',
        a: [
          'Plume est un clavier pour téléphone Android qui corrige l’orthographe et la grammaire de votre texte d’un simple appui sur un bouton, sans reformuler vos phrases.',
          'Il remplace votre clavier habituel et fonctionne dans toutes vos applications. Vous écrivez normalement, puis vous appuyez sur le bouton « Corriger » et Plume corrige les fautes. Sa particularité : il se comporte exactement comme un clavier classique, avec la même frappe, les mêmes suggestions et le même confort, en ajoutant la correction. Plume a été pensé pour être simple et reposant à lire, en particulier pour les personnes dyslexiques et dysorthographiques.',
        ],
      },
      {
        q: 'À quoi sert Plume ?',
        a: [
          'Plume sert à écrire sans fautes au quotidien (messages, e-mails, notes, réseaux sociaux) tout en gardant vos propres mots et votre style.',
          'Concrètement, vous tapez votre texte normalement, puis vous appuyez sur le bouton « Corriger » : Plume corrige alors les fautes d’orthographe et de grammaire en un instant, sans que vous ayez à copier-coller votre texte ailleurs ni à vérifier chaque mot. C’est une aide utile pour tous ceux qui veulent écrire avec assurance, et une vraie béquille au quotidien pour les personnes qui doutent de leur orthographe ou qui sont dyslexiques.',
        ],
      },
      {
        q: 'Existe-t-il un clavier sur téléphone qui corrige les fautes ?',
        a: [
          'Oui. Plume est un clavier Android qui corrige les fautes d’orthographe et de grammaire directement sur votre téléphone : vous écrivez, vous appuyez sur le bouton « Corriger », et le texte est corrigé.',
          'C’est justement ce qui le distingue. La plupart des correcteurs performants ont d’abord été conçus pour l’ordinateur ou le navigateur web. Or aujourd’hui, l’essentiel de ce qu’on écrit (messages, mails, publications) se tape sur téléphone. Plume amène la correction là où vous écrivez vraiment : dans le clavier de votre mobile, dans n’importe quelle application, sans passer par un logiciel à part.',
        ],
      },
      {
        q: 'La correction est-elle automatique ou faut-il appuyer sur un bouton ?',
        a: [
          'Vous appuyez sur un bouton. Vous écrivez d’abord votre texte, puis vous appuyez sur le bouton « Corriger » du clavier, et Plume corrige aussitôt votre texte.',
          'La correction ne se déclenche donc pas toute seule pendant que vous tapez : c’est vous qui décidez quand corriger, en un appui. Tout se passe sur place, dans l’application où vous écrivez, sans avoir à copier-coller votre texte dans un autre outil.',
        ],
      },
      {
        q: 'Est-ce que Plume corrige l’orthographe et la grammaire ?',
        a: [
          'Oui. Plume corrige à la fois l’orthographe et la grammaire : fautes d’accord, conjugaison, participes passés, homonymes (a/à, ou/où, ces/ses…), ponctuation et fautes de frappe.',
          'La correction se fait d’un appui sur le bouton « Corriger ». L’objectif n’est pas seulement de corriger les fautes faciles, mais aussi celles qui passent souvent inaperçues, comme les accords et les homonymes.',
        ],
      },
      {
        q: 'Est-ce que Plume reformule ou change mon style ?',
        a: [
          'Non. Plume corrige uniquement les fautes : il ne reformule pas vos phrases, ne change ni votre ton ni votre style, et ne remplace pas vos mots par d’autres.',
          'C’est une différence importante avec les assistants d’écriture qui réécrivent ou « améliorent » vos textes. Avec Plume, ce que vous lisez après correction, ce sont vos phrases, simplement sans les fautes. Vous gardez votre voix, votre niveau de langue et vos formulations.',
        ],
      },
      {
        q: 'Dans quelles applications Plume fonctionne-t-il ?',
        a: [
          'Plume fonctionne dans toutes les applications où vous écrivez : WhatsApp, SMS, Gmail et autres messageries, Instagram, Messenger, votre navigateur, vos notes, etc.',
          'Comme Plume est un clavier, il vous suit partout : dès que le clavier s’ouvre, il vous suffit d’appuyer sur le bouton « Corriger ». Et puisqu’il remplace votre clavier en se comportant comme un clavier normal, vous n’avez pas à jongler entre deux claviers, un pour écrire et un pour corriger.',
        ],
      },
    ],
  },
  {
    id: 'dyslexie',
    title: 'Dyslexie et pour qui',
    items: [
      {
        q: 'Existe-t-il une application pour écrire sans fautes quand on est dyslexique ?',
        a: [
          'Oui. Plume est une application clavier conçue pour aider les personnes dyslexiques et dysorthographiques à écrire sans fautes sur leur téléphone.',
          'Vous tapez votre message comme d’habitude, vous appuyez sur le bouton « Corriger », et Plume corrige l’orthographe et la grammaire sans changer vos mots. L’application est pensée pour être simple, lisible et sans jugement, afin d’écrire avec confiance au quotidien.',
        ],
      },
      {
        q: 'Quelle est la meilleure application de correction pour un adulte dyslexique ?',
        a: [
          'Pour un adulte dyslexique, une bonne application de correction doit réunir trois choses : corriger sans réécrire, rester très simple à utiliser, et être lisible et reposante pour les yeux. C’est exactement ce pour quoi Plume a été conçu.',
          'Beaucoup d’outils existants visent les enfants, la rééducation avec un orthophoniste, ou ajoutent quantité de fonctions (reformulation, traduction, chatbot) qui compliquent l’usage. Plume fait le choix inverse : il se concentre sur la correction des fautes au quotidien pour des adultes, dans une interface épurée et apaisante.',
        ],
      },
      {
        q: 'Plume est-il adapté à la dyslexie et à la dysorthographie ?',
        a: [
          'Oui. Plume a été pensé dès le départ pour les personnes dyslexiques et dysorthographiques.',
          'Cela se traduit par une police lisible aux lettres bien distinctes, des couleurs douces, l’absence de soulignement rouge anxiogène, une interface simple et une correction en un seul appui. L’idée est d’enlever la charge mentale liée à l’orthographe, sans renvoyer la personne à ses difficultés.',
        ],
      },
      {
        q: 'Plume fonctionne-t-il si j’écris « au son » (phonétiquement) ?',
        a: [
          'Oui, dans la plupart des cas. Plume s’appuie sur une intelligence artificielle capable de comprendre des mots écrits phonétiquement (par exemple « demin » pour « demain ») et de les corriger.',
          'C’est un point important, car les personnes dysorthographiques écrivent souvent au son. L’IA gère bien mieux ce type d’écriture qu’un correcteur classique fondé sur des règles fixes. Si une phrase est très éloignée de l’orthographe attendue, le résultat peut parfois demander une seconde correction, mais Plume est justement conçu pour ces cas-là.',
        ],
      },
      {
        q: 'Plume est-il réservé aux personnes dyslexiques ?',
        a: [
          'Non. Plume est pensé pour les personnes dys, mais il s’adresse à tous ceux qui veulent écrire sans fautes.',
          'Vous n’avez pas besoin d’être dyslexique pour l’utiliser. Le nom et l’apparence de l’application ne signalent rien de particulier : personne ne saura que vous l’utilisez pour vous aider. C’est un outil du quotidien, sans étiquette ni stigmatisation.',
        ],
      },
      {
        q: 'Faut-il un diagnostic de dyslexie pour utiliser Plume ?',
        a: [
          'Non. Aucun diagnostic n’est nécessaire pour télécharger et utiliser Plume.',
          'Plume n’est pas un dispositif médical ni un outil de soin : c’est une aide à l’écriture, ouverte à tout le monde. Vous pouvez l’utiliser que vous soyez diagnostiqué, en cours de diagnostic, ou simplement gêné par l’orthographe.',
        ],
      },
      {
        q: 'En quoi Plume est-il pensé pour les lecteurs dyslexiques ?',
        a: [
          'Plume applique les recommandations de lisibilité reconnues pour les personnes dys : une police claire aux lettres bien différenciées, un fond doux plutôt que blanc, des couleurs apaisantes et aucune surcharge visuelle.',
          'Le but est d’écrire sans stress. Pas de fond blanc éblouissant, pas de rouge qui renvoie à la faute, pas d’interface encombrée de boutons. Juste votre texte, et un appui pour le corriger.',
        ],
      },
    ],
  },
  {
    id: 'fonctionnement',
    title: 'Comment ça marche et installation',
    items: [
      {
        q: 'Comment installer et activer Plume sur Android ?',
        a: [
          'Pour installer Plume, téléchargez l’application depuis le Google Play Store, puis activez le clavier Plume dans les réglages de votre téléphone et sélectionnez-le comme clavier actif.',
          'L’opération prend quelques minutes et se fait une seule fois. Une fois activé, Plume apparaît dès que vous ouvrez un champ de texte, dans n’importe quelle application. Vous écrivez, puis vous appuyez sur le bouton « Corriger ».',
        ],
      },
      {
        q: 'Faut-il créer un compte ? Comment se connecter ?',
        a: [
          'Oui, Plume demande une inscription simple avec votre adresse e-mail, sans mot de passe à créer.',
          'À chaque connexion, un code à usage unique est envoyé sur votre e-mail : il vous suffit de le saisir pour accéder à l’application. Vous n’avez donc aucun mot de passe à retenir, ce qui est à la fois plus simple et plus sûr. Seule votre adresse e-mail est conservée.',
        ],
      },
      {
        q: 'Comment Plume corrige-t-il mes textes ?',
        a: [
          'Plume corrige vos textes grâce à une intelligence artificielle avancée. Lorsque vous appuyez sur « Corriger », votre texte est analysé puis renvoyé corrigé en un instant.',
          'Le traitement est assuré par un prestataire d’intelligence artificielle situé dans l’Union européenne. Vos textes ne sont pas conservés par Plume une fois la correction faite.',
        ],
      },
      {
        q: 'Plume fonctionne-t-il hors ligne ?',
        a: [
          'Non. Plume a besoin d’une connexion internet pour corriger, car la correction est réalisée par une intelligence artificielle en ligne.',
          'Vous pouvez écrire hors connexion comme avec n’importe quel clavier, mais le bouton « Corriger » nécessite internet pour fonctionner.',
        ],
      },
      {
        q: 'Plume propose-t-il la dictée vocale ?',
        a: [
          'Pas dans la première version. La dictée vocale n’est pas disponible au lancement de Plume.',
          'En attendant, vous pouvez continuer à utiliser la saisie vocale de votre téléphone si vous en avez l’habitude. Plume se concentre d’abord sur ce qu’il fait le mieux : corriger l’orthographe et la grammaire en un appui.',
        ],
      },
      {
        q: 'Faut-il remplacer mon clavier habituel par Plume ?',
        a: [
          'Oui, Plume devient votre clavier, mais il fonctionne exactement comme un clavier classique.',
          'Vous ne perdez ni le confort de frappe, ni les suggestions auxquelles vous êtes habitué. C’est justement ce qui distingue Plume des outils où l’on doit jongler entre deux claviers, l’un pour écrire et l’autre pour corriger. Vous gardez un seul clavier, avec la correction en plus, et vous pouvez revenir à votre ancien clavier à tout moment.',
        ],
      },
    ],
  },
  {
    id: 'comparaisons',
    title: 'Comparaisons',
    items: [
      {
        q: 'Quelle est la différence entre Plume et Scribens ?',
        a: [
          'La principale différence est que Plume est conçu spécifiquement pour les personnes dyslexiques et se limite à corriger, là où Scribens est un correcteur généraliste qui ajoute aussi de la reformulation, de la traduction et de nombreuses langues.',
          'Scribens est un outil puissant et gratuit, mais il signale les fautes en rouge et propose beaucoup de fonctions, ce qui peut alourdir l’expérience. Plume fait un choix différent : une interface calme et lisible pensée pour les dys, sans rouge, sans reformulation, et un clavier qui se comporte comme un clavier normal pour ne pas avoir à en changer. Si vous cherchez un couteau suisse multilingue gratuit, Scribens convient ; si vous voulez un outil simple et apaisant centré sur la correction, Plume est plus adapté.',
        ],
      },
      {
        q: 'Plume ou Scribens : lequel choisir quand on est dyslexique ?',
        a: [
          'Pour une personne dyslexique, Plume est pensé pour être plus reposant à utiliser, tandis que Scribens est plus complet mais aussi plus chargé.',
          'Plume mise sur la lisibilité (police claire, couleurs douces, pas de soulignement rouge), la simplicité (un seul bouton pour corriger) et un clavier unique qui remplace le vôtre sans perte de confort. Scribens reste une option valable et gratuite, mais son affichage en rouge et son grand nombre de fonctions peuvent être moins confortables quand l’orthographe est déjà une source de stress. Le mieux est d’essayer les deux, mais Plume a été dessiné précisément pour ce besoin.',
        ],
      },
      {
        q: 'Plume est-il une alternative à Grammarly en français ?',
        a: [
          'Oui. Plume peut être vu comme une alternative française à Grammarly, avec une différence importante : Plume corrige sans réécrire.',
          'Grammarly est avant tout pensé pour l’anglais et propose, en plus de la correction, de la réécriture de vos phrases par IA. Plume corrige le français comme d’autres langues, et ne touche jamais à votre style ni à vos mots. Si vous voulez garder vos formulations exactes, Plume est plus pertinent.',
        ],
      },
      {
        q: 'Pourquoi utiliser Plume plutôt que ChatGPT pour corriger ?',
        a: [
          'Parce que Plume corrige directement dans votre clavier, en un appui, sans changer votre style, alors que ChatGPT vous oblige à copier-coller votre texte et a tendance à le reformuler.',
          'Avec ChatGPT, vous quittez votre conversation, vous collez votre message, vous récupérez une version souvent réécrite, puis vous revenez. Avec Plume, vous restez dans l’application où vous écrivez, vous appuyez sur « Corriger », et vous obtenez vos phrases corrigées mais inchangées dans leur ton. C’est plus rapide, plus discret, et cela préserve votre manière d’écrire.',
        ],
      },
      {
        q: 'Plume remplace-t-il le correcteur intégré de Gboard ?',
        a: [
          'Plume va plus loin que la correction automatique de Gboard : il corrige la grammaire, les accords, la conjugaison et les homonymes sur l’ensemble de votre texte, à la demande.',
          'Gboard corrige surtout les fautes de frappe et propose des suggestions mot à mot pendant que vous tapez, mais il ne reprend pas une phrase entière pour en corriger la grammaire. Plume remplace votre clavier tout en se comportant comme un clavier normal, et ajoute cette correction complète en un appui sur le bouton « Corriger ».',
        ],
      },
    ],
  },
  {
    id: 'vie-privee',
    title: 'Vie privée et données',
    items: [
      {
        q: 'Mes textes sont-ils enregistrés ou stockés ?',
        a: [
          'Non, Plume ne conserve pas vos textes. Ils sont corrigés, puis ne sont pas gardés sur nos serveurs.',
          'Plume n’envoie votre texte que lorsque vous appuyez sur le bouton « Corriger », jamais en continu pendant que vous tapez. Le prestataire d’intelligence artificielle qui réalise la correction peut conserver les requêtes pendant une courte durée (au maximum 30 jours) uniquement pour prévenir les abus, avant de les supprimer.',
        ],
      },
      {
        q: 'Mes textes servent-ils à entraîner une IA ?',
        a: [
          'Non. Vos textes ne sont jamais utilisés pour entraîner une intelligence artificielle.',
          'Ils servent uniquement à produire la correction que vous demandez, puis ne sont pas réutilisés.',
        ],
      },
      {
        q: 'Où mes données sont-elles traitées ?',
        a: [
          'Vos textes sont traités au sein de l’Union européenne.',
          'Plume passe par un prestataire d’intelligence artificielle basé dans l’UE, et la seule donnée que Plume conserve de votre côté est votre adresse e-mail.',
        ],
      },
      {
        q: 'Plume est-il conforme au RGPD ?',
        a: [
          'Oui. Plume respecte le RGPD.',
          'Vous pouvez accéder à vos données, les exporter au format JSON et supprimer votre compte à tout moment depuis votre tableau de bord. Plume applique le principe de minimisation : il ne collecte que le strict nécessaire.',
        ],
      },
      {
        q: 'Qui peut voir ce que j’écris ?',
        a: [
          'Personne ne lit ce que vous écrivez. Plume n’envoie votre texte pour correction que lorsque vous appuyez sur le bouton, et ne le conserve pas.',
          'Ce déclenchement manuel est important : il n’y a aucune surveillance continue de votre frappe, contrairement à un outil qui analyserait tout en permanence.',
        ],
      },
    ],
  },
  {
    id: 'prix',
    title: 'Prix et abonnement',
    items: [
      {
        q: 'Plume est-il gratuit ?',
        a: [
          'Plume est gratuit pendant deux semaines, puis devient payant par abonnement.',
          'Vous profitez d’un accès complet sans payer pendant la période d’essai, et vous décidez ensuite si vous souhaitez continuer.',
        ],
      },
      {
        q: 'Pourquoi Plume est-il payant ?',
        a: [
          'Plume est payant parce que chaque correction est traitée par un prestataire d’intelligence artificielle que nous payons à chaque utilisation.',
          'Autrement dit, corriger un texte a un coût réel pour nous à chaque fois que vous appuyez sur « Corriger ». Pour couvrir ces frais et faire fonctionner le service dans la durée, nous sommes obligés de le proposer par abonnement. Nous avons choisi de garder un tarif volontairement bas, à 2,99 € par mois.',
        ],
      },
      {
        q: 'Combien coûte Plume ?',
        a: [
          'Plume coûte 2,99 € par mois, après une période d’essai gratuite de deux semaines.',
          'Il n’y a pas de frais cachés : l’abonnement est mensuel et son prix est clair.',
        ],
      },
      {
        q: 'Comment fonctionne l’essai gratuit ?',
        a: [
          'Vous bénéficiez de deux semaines d’accès complet et gratuit dès la création de votre compte, sans aucun prélèvement.',
          'À la fin des deux semaines, l’abonnement à 2,99 € par mois prend le relais. Si vous ne souhaitez pas continuer, vous pouvez résilier avant la fin de l’essai.',
        ],
      },
      {
        q: 'Y a-t-il un engagement ? Comment résilier ?',
        a: [
          'Non, il n’y a aucun engagement. Vous pouvez résilier à tout moment depuis votre tableau de bord.',
          'La résiliation prend effet à la fin de la période déjà payée, sans frais ni justification à fournir.',
        ],
      },
    ],
  },
  {
    id: 'compatibilite',
    title: 'Compatibilité',
    items: [
      {
        q: 'Sur quels appareils Plume fonctionne-t-il ?',
        a: [
          'Plume fonctionne sur les téléphones et tablettes Android, accompagné d’un site web pour gérer votre compte.',
          'L’application clavier s’installe sur Android, et le site sert à créer votre compte, gérer votre abonnement et vos appareils.',
        ],
      },
      {
        q: 'Plume est-il disponible sur iPhone ?',
        a: ['Pas pour le moment. Plume est disponible uniquement sur Android.'],
      },
      {
        q: 'Plume fonctionne-t-il dans d’autres langues que le français ?',
        a: [
          'Oui. Plume corrige dans toutes les langues, même s’il a été pensé d’abord pour le public francophone.',
          'Vous pouvez donc écrire et corriger vos textes quelle que soit la langue, en gardant le même fonctionnement : vous écrivez, vous appuyez sur « Corriger ».',
        ],
      },
    ],
  },
  {
    id: 'reassurance',
    title: 'Réassurance',
    items: [
      {
        q: 'Plume ralentit-il la frappe ?',
        a: [
          'Non. Plume se comporte comme un clavier classique pour la frappe, et la correction ne se déclenche que lorsque vous appuyez sur le bouton.',
          'Comme il n’analyse pas votre texte en continu, il n’y a pas de ralentissement quand vous écrivez.',
        ],
      },
      {
        q: 'Plume gère-t-il les accords, homonymes et conjugaisons difficiles ?',
        a: [
          'Oui. Plume corrige les accords, les homonymes (a/à, ces/ses, ou/où) et les conjugaisons, pas seulement les fautes de frappe.',
          'Grâce à l’intelligence artificielle, il tient compte du contexte de la phrase pour traiter ces cas qui échappent souvent aux correcteurs simples.',
        ],
      },
      {
        q: 'Que se passe-t-il si Plume se trompe ?',
        a: [
          'Si Plume propose une correction qui ne vous convient pas, un bouton vous permet de revenir en arrière, au texte tel qu’il était avant la correction.',
          'Plume est une aide, pas une autorité : vous gardez toujours le dernier mot et pouvez annuler une correction en un appui pour retrouver votre texte d’origine.',
        ],
      },
      {
        q: 'Un mineur peut-il utiliser Plume ?',
        a: [
          'Non. Plume est réservé aux personnes majeures, âgées de 18 ans et plus.',
          'L’inscription requiert d’avoir au moins 18 ans, conformément aux conditions d’utilisation.',
        ],
      },
    ],
  },
];
