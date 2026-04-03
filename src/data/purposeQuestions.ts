import { PurposeQuestion } from '@/types/purpose';

export const purposeQuestions: PurposeQuestion[] = [
  // meaning_orientation
  { id: 1, text: 'Eu sinto que minha vida tem uma direção clara e que minhas ações do dia a dia estão conectadas a algo maior.', axes: ['meaning_orientation'] },
  { id: 2, text: 'Eu consigo identificar facilmente o que me faz sentir que um dia foi significativo.', axes: ['meaning_orientation', 'fulfillment_level'] },
  { id: 3, text: 'Quando penso no que gostaria de construir na vida, a resposta vem com clareza e não com ansiedade.', axes: ['meaning_orientation', 'internal_conflict'] },

  // identity_alignment
  { id: 4, text: 'Meu dia a dia reflete quem eu realmente sou, e não apenas o que esperam de mim.', axes: ['identity_alignment'] },
  { id: 5, text: 'Eu sinto que estou vivendo uma vida que eu escolhi, e não uma vida que fui empurrado para viver.', axes: ['identity_alignment', 'external_pressure'] },
  { id: 6, text: 'Quando me imagino daqui a 5 anos, a visão me anima em vez de me assustar.', axes: ['identity_alignment', 'meaning_orientation'] },

  // internal_conflict
  { id: 7, text: 'Existe uma distância entre o que eu quero da vida e o que eu estou realmente fazendo com ela.', axes: ['internal_conflict'] },
  { id: 8, text: 'Eu sinto que tenho duas versões de mim: uma que sabe o que quer e outra que não consegue agir.', axes: ['internal_conflict', 'avoidance'] },
  { id: 9, text: 'Eu sinto um incômodo difuso com frequência, como se algo estivesse errado mas eu não consigo nomear.', axes: ['internal_conflict', 'fulfillment_level'] },

  // emotional_engagement
  { id: 10, text: 'Eu tenho momentos frequentes onde me sinto vivo, curioso e genuinamente interessado no que estou fazendo.', axes: ['emotional_engagement'] },
  { id: 11, text: 'Eu consigo me envolver profundamente em atividades a ponto de perder a noção do tempo.', axes: ['emotional_engagement', 'self_expression'] },
  { id: 12, text: 'Minha energia sobe quando encontro problemas complexos que considero importantes.', axes: ['emotional_engagement', 'meaning_orientation'] },

  // avoidance
  { id: 13, text: 'Eu evito pensar no futuro porque isso me gera angústia ou sensação de vazio.', axes: ['avoidance'] },
  { id: 14, text: 'Eu preencho meu tempo com atividades que me distraem de questões mais profundas sobre minha vida.', axes: ['avoidance', 'fulfillment_level'] },
  { id: 15, text: 'Quando alguém me pergunta o que eu quero da vida, eu sinto desconforto em vez de clareza.', axes: ['avoidance', 'internal_conflict'] },

  // external_pressure
  { id: 16, text: 'Muitas das minhas decisões de vida foram tomadas para atender expectativas de outras pessoas.', axes: ['external_pressure'] },
  { id: 17, text: 'Eu sinto que preciso justificar minhas escolhas para que os outros as considerem válidas.', axes: ['external_pressure', 'identity_alignment'] },
  { id: 18, text: 'Eu já deixei de seguir algo que me interessava porque não era considerado prático ou rentável.', axes: ['external_pressure', 'avoidance'] },

  // self_expression
  { id: 19, text: 'Eu tenho espaço na minha vida para expressar quem eu realmente sou, sem filtros ou máscaras.', axes: ['self_expression'] },
  { id: 20, text: 'Quando falo sobre o que realmente me importa, as pessoas ao meu redor entendem e respeitam.', axes: ['self_expression', 'identity_alignment'] },
  { id: 21, text: 'Eu sinto que meus talentos naturais estão sendo usados no meu dia a dia.', axes: ['self_expression', 'emotional_engagement'] },

  // fulfillment_level
  { id: 22, text: 'No final do dia, raramente sinto que desperdicei meu tempo.', axes: ['fulfillment_level'] },
  { id: 23, text: 'Eu sinto um vazio recorrente que não consigo explicar, mesmo quando está tudo bem na superfície.', axes: ['fulfillment_level', 'internal_conflict'] },
  { id: 24, text: 'Se eu pudesse recomeçar, escolheria um caminho muito diferente do que estou vivendo agora.', axes: ['fulfillment_level', 'identity_alignment'] },

  // Afirmações integradoras
  { id: 25, text: 'Eu me sinto perdido quando tento definir o que realmente importa para mim.', axes: ['avoidance', 'internal_conflict'] },
  { id: 26, text: 'Eu aceito oportunidades que pagam bem mesmo quando não têm nada a ver com o que me move.', axes: ['identity_alignment', 'external_pressure'] },
  { id: 27, text: 'Eu sinto ansiedade ao pensar na semana que está por vir.', axes: ['fulfillment_level', 'emotional_engagement'] },
  { id: 28, text: 'Eu olho para minhas conquistas e sinto indiferença ou vazio em vez de orgulho.', axes: ['meaning_orientation', 'self_expression'] },

  // Padrões recorrentes
  { id: 29, text: 'Eu sinto que estou vivendo no piloto automático, sem propósito claro.', axes: ['fulfillment_level', 'avoidance'] },
  { id: 30, text: 'Eu tomo decisões baseadas no que os outros esperam de mim.', axes: ['external_pressure', 'identity_alignment'] },
  { id: 31, text: 'A distância entre quem eu sou e como eu vivo gera desconforto interior.', axes: ['internal_conflict', 'identity_alignment'] },
  { id: 32, text: 'Eu me sinto emocionalmente desconectado das minhas atividades diárias.', axes: ['emotional_engagement', 'self_expression'] },
];
