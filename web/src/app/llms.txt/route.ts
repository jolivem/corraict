import { getFaq } from '@/lib/faq';
import { siteUrl } from '@/lib/site';

// Served at /llms.txt — the emerging convention for giving LLMs a clean,
// plain-text overview of the site. We build it straight from the FAQ data so
// it can never drift from the human-facing /faq page.
export const dynamic = 'force-static';

export function GET() {
  const base = siteUrl();
  const faq = getFaq('fr');

  const body = [
    '# Plume',
    '',
    "> Plume est un clavier Android qui corrige l'orthographe et la grammaire de vos textes en un simple appui sur un bouton, sans reformuler vos phrases ni changer votre style. Il a été conçu pour être simple et reposant à lire, en particulier pour les personnes dyslexiques et dysorthographiques.",
    '',
    '## Points clés',
    '- Plateforme : application clavier pour Android (téléphones et tablettes). Pas encore disponible sur iPhone.',
    '- Fonctionnement : vous écrivez, puis vous appuyez sur le bouton « Corriger » ; la correction se fait à la demande, pas en continu.',
    "- Correction : orthographe et grammaire (accords, conjugaison, homonymes), sans reformulation ni changement de style.",
    '- Prix : gratuit pendant 2 mois, puis 2,99 € par mois, sans engagement, résiliable à tout moment.',
    "- Vie privée : les textes ne sont pas stockés, sont traités au sein de l'Union européenne et ne servent jamais à entraîner une IA.",
    '',
    '## Liens',
    `- Site web : ${base}`,
    `- FAQ (français) : ${base}/fr/faq`,
    `- FAQ (anglais) : ${base}/en/faq`,
    '',
    '## FAQ',
    ...faq.flatMap((category) => [
      '',
      `### ${category.title}`,
      ...category.items.flatMap((item) => [
        '',
        `#### ${item.q}`,
        ...item.a,
      ]),
    ]),
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
