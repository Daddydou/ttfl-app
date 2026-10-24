// Onglet « Mode op. » : UNE SEULE source de vérité pour tous les modes opératoires de l'application.
//
// POUR MODIFIER UN MODE OPÉRATOIRE : changer le texte ci-dessous (ou demander à Claude : « modifie le mode opératoire
// X »), mettre à jour la date `misAJour`, publier. La page /mode-operatoire se met à jour toute seule.
// RÈGLES : jamais de cookie, clé, mot de passe ni jeton ici ; jamais le nom du joueur d'un pick secret ;
// pas de canal Telegram (abandonné par l'utilisateur le 23/10/2026).

export type SectionMode = "comprendre" | "soir" | "surveillance" | "entretien" | "retenir";

export interface ModeOperatoire {
  id: string; // sert d'ancre (#id) : ne pas changer une fois publié
  section: SectionMode;
  titre: string;
  pourQuoi: string; // en une phrase : à quoi ça sert
  quand: string; // à quel moment l'utiliser
  etapes: string[]; // dans l'ordre, une action par ligne
  attention?: string[]; // pièges et règles à ne pas oublier
  lien?: { href: string; libelle: string }; // raccourci vers l'écran concerné
  misAJour: string; // AAAA-MM-JJ
}

export const SECTIONS: { id: SectionMode; titre: string; description: string }[] = [
  { id: "comprendre", titre: "Comprendre le système", description: "Qui fait quoi, pour savoir quand t'inquiéter (et quand non)." },
  { id: "soir", titre: "Chaque jour, chaque soir", description: "Ce que tu fais toi-même autour des picks et du jeu des vainqueurs." },
  { id: "surveillance", titre: "Surveillance et alertes", description: "Vérifier que tout va bien et réagir aux alertes." },
  { id: "entretien", titre: "Entretien (rare)", description: "À faire de temps en temps : cookies, jeton, mode du moteur." },
  { id: "retenir", titre: "À retenir", description: "Dates importantes, règles d'or et façon de modifier cette page." },
];

export const MODES: ModeOperatoire[] = [
  // ── Comprendre ─────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "fonctionnement",
    section: "comprendre",
    titre: "Comment tout ça marche, en bref",
    pourQuoi: "Savoir que le système travaille seul, et ce qui reste à ta charge.",
    quand: "À lire une fois, puis quand tu doutes de quelque chose.",
    etapes: [
      "Le cloud fait tout le travail : calculs, picks automatiques, envois vers le site TTFL. Le PC peut rester éteint.",
      "Matin (≈ 9 h 40) : archivage des résultats de la veille, vérification des connexions TTFL.",
      "10 h 20 et 15 h 20 : calendrier, prévisions des prochaines nuits et Plan 30 jours.",
      "À partir de 16 h : prévisions du soir (16 h, 18 h, 20 h, puis 2 h 30 et 1 h 15 avant la clôture), picks automatiques, envoi des picks sur le site.",
      "Contrôle de sécurité : 23 h 28 et 23 h 48 (et 30 min avant la clôture si elle tombe avant 23 h) : remplacement des joueurs Out, Doubtful ou absents, cases vides remplies.",
      "Ce qui reste pour toi : choisir à la main les picks que tu veux imposer, regarder les alertes, renouveler les cookies tous les 2 mois environ.",
    ],
    attention: ["Une soirée NBA se date à l'heure de New York. La clôture est le début du 1er match avant minuit (heure de Paris), sinon minuit."],
    lien: { href: "/admin", libelle: "Ouvrir Admin" },
    misAJour: "2026-10-24",
  },
  {
    id: "comptes",
    section: "comprendre",
    titre: "Comment chaque compte est géré",
    pourQuoi: "Savoir quel compte est piloté comment (pick automatique, formule, équipe).",
    quand: "Quand tu te demandes pourquoi un compte a (ou n'a pas) un pick.",
    etapes: [
      "Compte 01 (principal) : ton choix à la main n'est jamais changé, sauf si ton joueur devient Out, Doubtful ou absent : le contrôle d'avant-clôture (ou de 23 h 30) met alors le meilleur joueur conseillé en bonne santé, pour ne pas faire 0. Il remplit aussi une case vide. Un pré-pick que tu n'as pas touché est remplacé le jour même par le n°1 de ton Plan 30.",
      "Compte 02 : pick automatique = n°1 du Plan 30, formule Prudente, avec pick secret (voir « Le pick secret »).",
      "Compte 13 : pick automatique = n°1 du Plan 30, formule Ambitieuse.",
      "Comptes 03 à 12 (équipe) : cases vides remplies dès 18 h avec les 2-3 premiers joueurs conseillés, 6 comptes au maximum par joueur.",
      "Pré-picks : pour J+1 à J+3, les cases vides des 13 comptes sont remplies à l'avance. Pour 01, 02 et 13, un pré-pick intact suit le Plan 30 recalculé.",
      "Un pick choisi à la main n'est jamais modifié par un pré-pick.",
    ],
    attention: ["Un joueur pické ne peut plus l'être pendant 30 jours sur le même compte (Plus > Stars)."],
    lien: { href: "/stars", libelle: "Voir les stars bloquées" },
    misAJour: "2026-10-24",
  },
  {
    id: "fourchette",
    section: "comprendre",
    titre: "Lire la fourchette « S’il joue »",
    pourQuoi: "Comprendre ce que vaut vraiment la projection : ce n'est pas un score moyen attendu.",
    quand: "Quand tu compares deux joueurs conseillés, ou que tu hésites entre un pari sûr et un joueur à gros plafond.",
    etapes: [
      "Sur chaque carte de l'onglet Conseillés, la ligne « S’il joue » donne trois chiffres : mauvais soir, soir moyen, bon soir.",
      "Mauvais soir : 1 soir sur 10 fait moins que ce chiffre. Bon soir : 1 soir sur 10 fait plus. Soir moyen : la moyenne réelle.",
      "La chance de faire 40 ou plus est aussi indiquée. Exemple : une projection de 42 donne en moyenne ≈ 34, avec ≈ 36 % de chances d'atteindre 40.",
      "Ces chiffres ont été mesurés sur 4 saisons NBA (2022-23 à 2025-26) avec les scores TTFL réels.",
    ],
    attention: [
      "La projection du moteur contient volontairement une part de « plafond » (le bon soir du joueur) : elle est plus haute que la moyenne réelle.",
      "Les chiffres supposent que le joueur joue. S'il est absent, le score est 0 : c'est le rôle du contrôle de 23 h 30.",
      "Affichage seulement : cela ne change ni le classement ni les picks. Pour recalibrer (début de saison suivante), relancer l'étude ttfl/recherche/etude_b14_fourchette.py et mettre à jour lib/fourchette.ts.",
    ],
    misAJour: "2026-10-24",
  },


  // ── Chaque jour, chaque soir ───────────────────────────────────────────────────────────────────────────────
  {
    id: "choisir-pick",
    section: "soir",
    titre: "Choisir ou changer un pick à la main",
    pourQuoi: "Imposer ton choix à la place de celui du robot.",
    quand: "Quand tu préfères un autre joueur que celui conseillé, avant la clôture de la soirée.",
    etapes: [
      "Ouvre l'onglet Conseillés et repère la soirée voulue.",
      "Touche « Choisir un joueur » (ou « Changer » s'il y a déjà un pick) puis le joueur voulu.",
      "Pour ne modifier que certains comptes : « Modifier certains comptes », coche les comptes, puis choisis le joueur.",
      "Confirme avec « Valider ». Le pick part ensuite sur le site TTFL à la prochaine synchro.",
      "Pour qu'un pick du Plan 30 ne bouge plus quand un autre joueur devient n°1 : touche « Valider à la main » (et « Déverrouiller » pour annuler).",
    ],
    attention: [
      "Le verrou « Valider à la main » protège d'un changement de n°1, pas d'une indisponibilité : un joueur Out, Doubtful ou absent est quand même remplacé.",
    ],
    lien: { href: "/ce-soir", libelle: "Ouvrir Conseillés" },
    misAJour: "2026-10-23",
  },
  {
    id: "verifier-picks",
    section: "soir",
    titre: "Vérifier que tes picks sont bien posés",
    pourQuoi: "T'assurer que chaque compte a un pick avant la clôture.",
    quand: "Dans la soirée, avant la clôture (un veilleur t'alerte aussi s'il manque un pick 2 h 45 avant).",
    etapes: [
      "Ouvre « Mes picks » : chaque compte doit avoir un joueur pour la soirée du jour.",
      "Si un pick manque ou paraît faux, ouvre Plus > Admin > Journal d’envoi (statut de chaque compte).",
      "Pour renvoyer tes picks sur le site : Plus > Admin > Actions > Synchronisation avec TTFL > « Envoyer mes picks sur le site TTFL ».",
      "Attends 2 à 5 minutes puis regarde l'historique des commandes (statut « Terminée »).",
      "Le lendemain : « Mes picks » > Historique montre les points de chaque compte (choisis le compte en haut), remplis automatiquement vers 9 h 45.",
    ],
    attention: ["Si l'envoi est en « Échec », regarde d'abord que les connexions TTFL sont valides (voir « Renouveler les cookies »)."],
    lien: { href: "/picks", libelle: "Ouvrir Mes picks" },
    misAJour: "2026-10-24",
  },
  {
    id: "controle-2330",
    section: "soir",
    titre: "Le contrôle de 23 h 30 (filet de sécurité)",
    pourQuoi: "Remplacer automatiquement un joueur blessé ou absent et remplir les cases vides, pour les 13 comptes.",
    quand: "Il part tout seul en fin de soirée ; tu ne le lances à la main que si tu as un doute.",
    etapes: [
      "Rien à faire en temps normal : le cloud le lance 30 min avant la clôture (si elle est avant 23 h), puis vers 23 h 28 et 23 h 48. Après la clôture, il ne peut plus rien remplacer : il vérifie seulement.",
      "Pour le lancer toi-même : Plus > Admin > Actions > Synchronisation avec TTFL > « Lancer le contrôle de 23 h 30 maintenant ».",
      "Ensuite, regarde Plus > Admin > Journal des actions : tu y vois ce qui a été remplacé et pourquoi.",
    ],
    attention: ["Un pick que tu as choisi à la main est remplacé seulement s'il devient Out, Doubtful ou absent."],
    lien: { href: "/admin/actions", libelle: "Ouvrir les actions" },
    misAJour: "2026-10-24",
  },
  {
    id: "pick-secret",
    section: "soir",
    titre: "Le pick secret du compte 02",
    pourQuoi: "Cacher le joueur du compte 02 (dans l'app et les notifications) jusqu'à la clôture de la soirée.",
    quand: "Quand tu veux activer ou couper le secret, ou révéler une soirée plus tôt.",
    etapes: [
      "Ouvre Plus > Admin > Pick secret.",
      "« Activer » / « Désactiver » : le secret s'applique à toutes les soirées à venir.",
      "À la clôture, une notification te donne le joueur.",
      "Pour révéler avant la clôture : touche « Révéler » sur la ligne de la soirée.",
    ],
    attention: [
      "Tant qu'une soirée est secrète, ne cite jamais le joueur du compte 02 (ni dans l'app, ni dans un message, ni dans un log).",
      "Si le réglage est illisible, l'app cache tout par prudence.",
    ],
    lien: { href: "/admin/secret", libelle: "Ouvrir Pick secret" },
    misAJour: "2026-10-24",
  },
  {
    id: "vainqueurs",
    section: "soir",
    titre: "Jeu des vainqueurs : modifier un vainqueur",
    pourQuoi: "Choisir toi-même le vainqueur d'un match au lieu du favori choisi automatiquement.",
    quand: "Quand tu veux contredire le favori (cote la plus basse) avant le début du match.",
    etapes: [
      "Ouvre l'onglet Vainqueurs et repère le match.",
      "Modifie le vainqueur et enregistre.",
      "Le message « Envoi chez Thomas en cours » s'affiche : ton choix arrive dans l'application de Thomas en 3 minutes environ (mesuré le 23/10 : 2 min 45 s), jusqu'à 6-7 minutes si le moteur cloud est déjà en train de tourner.",
      "Quand « Validé chez Thomas » s'affiche (avec une coche verte), c'est enregistré chez lui. En cas de doute, regarde Plus > Admin > Journal des actions.",
    ],
    attention: ["Chaque match se ferme à son coup d'envoi : modifie ton choix avant, l'envoi se fait match par match."],
    lien: { href: "/vainqueurs", libelle: "Ouvrir Vainqueurs" },
    misAJour: "2026-10-24",
  },

  // ── Surveillance et alertes ────────────────────────────────────────────────────────────────────────────────
  {
    id: "sante",
    section: "surveillance",
    titre: "Vérifier que le système est en bonne santé",
    pourQuoi: "Voir en 30 secondes si le cloud tourne et si une tâche est en retard.",
    quand: "Chaque matin si tu veux, ou dès qu'une alerte t'inquiète.",
    etapes: [
      "Ouvre Plus > Admin. La pastille en haut doit dire « Cloud en charge — le PC est au repos ».",
      "Regarde la carte « Santé » : chaque tâche doit être à jour (pas en retard).",
      "Regarde « Moteur dans le cloud » : la date du dernier lancement doit être récente.",
      "Regarde l'aperçu du Journal : il explique chaque action (cause puis conséquences).",
      "Si une tâche est en retard, attends 5 minutes (le cloud est réveillé toutes les 5 minutes), puis relance-la dans Plus > Admin > Actions (par exemple « Recalculer ce soir »).",
    ],
    attention: ["Si rien ne se rétablit, ne bricole pas : note ce que tu vois et demande à Claude."],
    lien: { href: "/admin", libelle: "Ouvrir Admin" },
    misAJour: "2026-10-24",
  },
  {
    id: "notifications",
    section: "surveillance",
    titre: "Activer les notifications sur ton téléphone",
    pourQuoi: "Recevoir les alertes importantes (pick manquant, joueur Out, cookies, moteur en panne) en plus de ntfy.",
    quand: "Une seule fois par appareil.",
    etapes: [
      "iPhone seulement : dans Safari, touche Partager puis « Sur l'écran d'accueil », puis rouvre l'application depuis son icône.",
      "Ouvre Plus > Admin > Notifications.",
      "Touche « Activer les notifications » et accepte l'autorisation du téléphone.",
      "Le message « Notifications activées sur cet appareil » confirme que c'est bon.",
      "Pour arrêter : « Désactiver sur cet appareil ».",
    ],
    attention: [
      "Si le téléphone a refusé les notifications, autorise-les dans ses réglages pour cette application.",
      "ntfy continue de fonctionner comme avant : les notifications de l'app s'y ajoutent.",
    ],
    lien: { href: "/admin/notifications", libelle: "Ouvrir Notifications" },
    misAJour: "2026-10-24",
  },
  {
    id: "alerte-out",
    section: "surveillance",
    titre: "Une alerte dit qu'un joueur pické est Out",
    pourQuoi: "Remplacer à temps un joueur qui ne jouera pas.",
    quand: "Quand tu reçois l'alerte blessure sur un de tes picks.",
    etapes: [
      "Ouvre l'alerte (ou « Mes picks ») pour voir quel compte est concerné.",
      "Si tu veux choisir toi-même le remplaçant : suis « Choisir ou changer un pick à la main » avant la clôture.",
      "Sinon, ne fais rien : le contrôle de 23 h 30 remplace tout joueur Out, Doubtful ou absent.",
    ],
    attention: ["L'alerte vient du rapport officiel des blessures (ESPN). Un joueur « Day-To-Day » est traité comme douteux."],
    lien: { href: "/picks", libelle: "Ouvrir Mes picks" },
    misAJour: "2026-10-23",
  },
  {
    id: "alerte-budget",
    section: "surveillance",
    titre: "Alerte : minutes GitHub presque épuisées",
    pourQuoi: "Éviter que le cloud s'arrête faute de minutes gratuites (2 000 par mois).",
    quand: "Quand tu reçois l'alerte « minutes GitHub > 1 700 sur 2 000 ».",
    etapes: [
      "Ne relance pas d'actions inutiles dans Plus > Admin > Actions : chaque lancement consomme des minutes.",
      "Le régime normal est d'environ 40 à 45 minutes par jour.",
      "Préviens Claude : il regarde ce qui consomme et allège les passages.",
    ],
    attention: ["Ne coupe pas le moteur cloud de ton côté sans en parler : le PC devrait alors tout reprendre."],
    misAJour: "2026-10-24",
  },

  // ── Entretien (rare) ───────────────────────────────────────────────────────────────────────────────────────
  {
    id: "jeton-github",
    section: "entretien",
    titre: "Créer le jeton GitHub (une fois, puis chaque année)",
    pourQuoi: "Permettre à l'application de poser un nouveau cookie dans les secrets GitHub du robot.",
    quand: "Avant ton premier renouvellement de cookie dans l'app, puis à chaque expiration (1 an).",
    etapes: [
      "Va sur github.com/settings/personal-access-tokens/new (jeton « fine-grained »).",
      "Nom : « ttfl-app cookies ». Expiration : 1 an (note la date).",
      "Repository access : « Only select repositories », choisis seulement Daddydou/ttfl-auto.",
      "Repository permissions : « Secrets » = Read and write. Aucune autre permission.",
      "« Generate token » et copie-le tout de suite (il ne s'affiche qu'une fois).",
      "Sur vercel.com : projet ttfl-app > Settings > Environment Variables. Nom exact : GITHUB_SECRETS_TOKEN. Colle le jeton, coche Production, Save.",
      "Deployments > déploiement du haut > « ⋯ » > Redeploy. Attends « Ready ».",
      "Dans Plus > Admin > Cookies TTFL, le bandeau orange « il manque le jeton GitHub » doit avoir disparu.",
    ],
    attention: [
      "Colle le jeton uniquement dans Vercel, jamais dans un message ni dans le chat.",
      "À la même période, pense au jeton « ttfl-reveil » (échéance octobre 2027) : demande à Claude de le renouveler.",
    ],
    lien: { href: "/admin/cookies", libelle: "Ouvrir Cookies TTFL" },
    misAJour: "2026-10-24",
  },
  {
    id: "cookies",
    section: "entretien",
    titre: "Renouveler les cookies TTFL (tous les 2 mois environ)",
    pourQuoi: "Le robot se connecte au site TTFL avec le cookie « se souvenir de moi » de chaque compte ; il expire au bout de 2 mois.",
    quand: "Quand Plus > Admin > Cookies TTFL indique « à renouveler bientôt » (une alerte te prévient aussi). Prochaine échéance : avant mi-décembre.",
    etapes: [
      "Vérifie d'abord que le jeton GitHub est en place (sinon le bouton « Renouveler » est grisé).",
      "Sur ton ordinateur, connecte-toi au site TTFL avec le compte voulu en cochant « se souvenir de moi ».",
      "F12 > onglet Application (Chrome / Edge) ou Stockage (Firefox) > Cookies > site TTFL.",
      "Copie les valeurs de TTFLhash et de TTFLmail et assemble-les sur une seule ligne : TTFLhash=…; TTFLmail=…",
      "Dans l'app : Plus > Admin > Cookies TTFL > « Renouveler » sur la ligne du compte > colle la ligne > « Enregistrer ».",
      "Un message vert confirme. La ligne du compte n'affiche plus « ≈ » (date exacte). Recommence pour chaque compte à renouveler.",
    ],
    attention: [
      "On ne peut pas automatiser ce renouvellement : la connexion au site est protégée par Cloudflare Turnstile et le site ne prolonge pas les cookies quand on s'en sert.",
      "Un cookie vaut un mot de passe : ne le colle que dans l'app, jamais dans un chat ni dans un fichier partagé.",
    ],
    lien: { href: "/admin/cookies", libelle: "Ouvrir Cookies TTFL" },
    misAJour: "2026-10-24",
  },
  {
    id: "mode-cloud",
    section: "entretien",
    titre: "Changer le mode du moteur (Arrêté / Essai à blanc / Cloud en charge)",
    pourQuoi: "Choisir qui travaille : le cloud en vrai, le cloud pour essayer, ou le PC.",
    quand: "Très rarement : retour arrière en cas de gros problème, ou test après une modification.",
    etapes: [
      "Ouvre Plus > Admin > Moteur dans le cloud.",
      "« Cloud en charge » : le cloud fait tout en vrai (une confirmation est demandée).",
      "« Essai à blanc » : le cloud tourne en simulation, sans toucher aux vrais picks.",
      "« Arrêté » : le cloud ne fait rien et le PC reprend la main.",
    ],
    attention: [
      "Demande-moi (Claude) avant de changer de mode : c'est un réglage important qui doit rester d'un commun accord.",
      "Avec « Arrêté » ou « Essai à blanc », le PC doit être allumé pour que les picks soient posés.",
    ],
    lien: { href: "/admin/cloud", libelle: "Ouvrir Moteur dans le cloud" },
    misAJour: "2026-10-24",
  },
  {
    id: "actions-manuelles",
    section: "entretien",
    titre: "Relancer un calcul ou une synchro à la main",
    pourQuoi: "Forcer un recalcul quand les données ont changé ou qu'une tâche est restée en retard.",
    quand: "Seulement si la page Santé le justifie : le cloud relance déjà tout seul.",
    etapes: [
      "Ouvre Plus > Admin > Actions et choisis le groupe : Calculs et statistiques, Données, Synchronisation avec TTFL, Suivi.",
      "Calculs : « Recalculer ce soir », « Recalculer les prochaines soirées », « Recalculer le plan 30 jours ».",
      "Synchro : « Envoyer mes picks sur le site TTFL », « Synchronisation complète (2 sens) », « Vérifier les 13 connexions TTFL ».",
      "Touche l'action et attends 2 à 5 minutes. Le résultat apparaît dans l'historique des commandes (Terminée ou Échec).",
    ],
    attention: [
      "Quatre actions attendent le PC : « Mettre à jour les repères », « Capturer les scores réels d'un soir », « Importer les cotes de paris » et « Suivi du match-up 0,6 ».",
      "Chaque lancement consomme des minutes GitHub : ne relance pas en boucle.",
    ],
    lien: { href: "/admin/actions", libelle: "Ouvrir les actions" },
    misAJour: "2026-10-24",
  },

  // ── À retenir ──────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "dates",
    section: "retenir",
    titre: "Dates à retenir",
    pourQuoi: "Ne pas rater les échéances qui demandent une action de ta part.",
    quand: "À relire de temps en temps.",
    etapes: [
      "Saison régulière 2026-27 : du 20/10/2026 au 11/04/2027.",
      "Avant mi-décembre 2026 : renouveler les cookies des comptes (voir « Renouveler les cookies »).",
      "Vers le 20/11/2026 : réévaluer les formules du Plan 30 (Prudente, Équilibrée, Ambitieuse) sur les vrais résultats.",
      "Avant mi-avril 2027 : revoir le mode playoffs et la fin de saison (repos des stars, équipes qui tankent).",
      "Octobre 2027 : jeton GitHub « ttfl-reveil » à renouveler ; changement de saison à prévoir dans le moteur.",
      "Chaque année : jeton GitHub des cookies (voir « Créer le jeton GitHub »).",
    ],
    misAJour: "2026-10-23",
  },
  {
    id: "regles",
    section: "retenir",
    titre: "Les règles d'or",
    pourQuoi: "Protéger tes comptes et garder le contrôle sur les décisions importantes.",
    quand: "Toujours.",
    etapes: [
      "Jamais de cookie, clé, jeton ni mot de passe dans un message, un chat, un log ou un commit. Seulement dans l'app, Vercel ou GitHub.",
      "Ne jamais citer le joueur du compte 02 tant que sa soirée est secrète.",
      "Accord explicite de ta part avant : un changement de formule ou de réglage du moteur, un envoi réel de pick, un changement de mode.",
      "Toute idée de calcul : d'abord une étude (backtest), ensuite ton accord, ensuite la production.",
    ],
    misAJour: "2026-10-23",
  },
  {
    id: "modifier-modes",
    section: "retenir",
    titre: "Comment modifier ces modes opératoires",
    pourQuoi: "Garder cette page juste quand le système change.",
    quand: "Dès qu'une procédure change ou qu'il en manque une.",
    etapes: [
      "Dis à Claude : « modifie le mode opératoire X » (ou « ajoute un mode opératoire sur Y ») avec ce qui doit changer.",
      "Tout le contenu est dans un seul fichier de l'application (lib/modes-operatoires.ts) : Claude le met à jour, ajuste la date « Mis à jour le » et publie.",
      "Un nouveau mode opératoire apparaît tout seul dans la bonne section ; la date de chaque fiche indique sa dernière mise à jour.",
    ],
    attention: ["Les modes opératoires sont des guides : si le système et la fiche se contredisent, fais confiance à l'écran Plus > Admin et préviens Claude."],
    misAJour: "2026-10-24",
  },
];

export function modesParSection(modes: ModeOperatoire[] = MODES): { section: (typeof SECTIONS)[number]; modes: ModeOperatoire[] }[] {
  return SECTIONS.map((section) => ({ section, modes: modes.filter((m) => m.section === section.id) })).filter((g) => g.modes.length > 0);
}
