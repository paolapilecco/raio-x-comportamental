import { PurposeQuestion } from '@/types/purpose';

type QuestionType = 'likert' | 'behavior_choice' | 'frequency' | 'intensity';

interface ExtendedPurposeQuestion extends PurposeQuestion {
  type?: QuestionType;
  options?: string[];
}

export const purposeQuestions: ExtendedPurposeQuestion[] = [
  // meaning_orientation — likert
  { id: 1, text: 'Sinto que minha vida tem uma direção clara e que minhas ações do dia a dia estão conectadas a algo maior.', axes: ['meaning_orientation'] },
  { id: 2, text: 'Consigo identificar facilmente o que me faz sentir que um dia foi significativo — e o que faz parecer vazio.', axes: ['meaning_orientation', 'fulfillment_level'] },
  { id: 3, text: 'Quando penso no que eu gostaria de construir na vida, a resposta vem com clareza e não com ansiedade.', axes: ['meaning_orientation', 'internal_conflict'] },

  // identity_alignment — likert
  { id: 4, text: 'Meu dia a dia reflete quem eu realmente sou — e não apenas o que esperam de mim.', axes: ['identity_alignment'] },
  { id: 5, text: 'Sinto que estou vivendo uma vida que eu escolhi, e não uma vida que fui empurrado para viver.', axes: ['identity_alignment', 'external_pressure'] },
  { id: 6, text: 'Quando me imagino daqui a 5 anos, a visão me anima em vez de me assustar.', axes: ['identity_alignment', 'meaning_orientation'] },

  // internal_conflict — likert
  { id: 7, text: 'Existe uma distância entre o que eu quero da vida e o que eu estou realmente fazendo com ela.', axes: ['internal_conflict'] },
  { id: 8, text: 'Sinto que tenho duas versões de mim: uma que sabe o que quer e outra que não consegue agir sobre isso.', axes: ['internal_conflict', 'avoidance'] },
  { id: 9, text: 'Frequentemente sinto um incômodo difuso, como se algo estivesse "errado" mas eu não consigo nomear exatamente o quê.', axes: ['internal_conflict', 'fulfillment_level'] },

  // emotional_engagement — likert
  { id: 10, text: 'Tenho momentos frequentes onde me sinto vivo, curioso e genuinamente interessado no que estou fazendo.', axes: ['emotional_engagement'] },
  { id: 11, text: 'Consigo me envolver profundamente em atividades a ponto de perder a noção do tempo.', axes: ['emotional_engagement', 'self_expression'] },
  { id: 12, text: 'Minha energia sobe quando encontro problemas complexos que considero importantes.', axes: ['emotional_engagement', 'meaning_orientation'] },

  // avoidance — likert
  { id: 13, text: 'Evito pensar no futuro porque isso me gera angústia ou sensação de vazio.', axes: ['avoidance'] },
  { id: 14, text: 'Preencho meu tempo com atividades que me distraem de questões mais profundas sobre minha vida.', axes: ['avoidance', 'fulfillment_level'] },
  { id: 15, text: 'Quando alguém me pergunta "o que você quer da vida?", sinto desconforto em vez de clareza.', axes: ['avoidance', 'internal_conflict'] },

  // external_pressure — likert
  { id: 16, text: 'Muitas das minhas decisões de vida foram tomadas para atender expectativas de outras pessoas.', axes: ['external_pressure'] },
  { id: 17, text: 'Sinto que preciso justificar minhas escolhas para que os outros as considerem válidas.', axes: ['external_pressure', 'identity_alignment'] },
  { id: 18, text: 'Já deixei de seguir algo que me interessava porque "não daria dinheiro" ou "não era prático".', axes: ['external_pressure', 'avoidance'] },

  // self_expression — likert
  { id: 19, text: 'Tenho espaço na minha vida para expressar quem eu realmente sou — sem filtros ou máscaras.', axes: ['self_expression'] },
  { id: 20, text: 'Quando falo sobre o que realmente me importa, as pessoas ao meu redor entendem e respeitam.', axes: ['self_expression', 'identity_alignment'] },
  { id: 21, text: 'Sinto que meus talentos naturais estão sendo usados no meu dia a dia — não apenas guardados.', axes: ['self_expression', 'emotional_engagement'] },

  // fulfillment_level — likert
  { id: 22, text: 'No final do dia, raramente sinto que desperdicei meu tempo — sinto que vivi de verdade.', axes: ['fulfillment_level'] },
  { id: 23, text: 'Sinto um vazio recorrente que não consigo explicar, mesmo quando "está tudo bem" na superfície.', axes: ['fulfillment_level', 'internal_conflict'] },
  { id: 24, text: 'Se eu pudesse recomeçar, escolheria um caminho muito diferente do que estou vivendo agora.', axes: ['fulfillment_level', 'identity_alignment'] },

  // behavior_choice — cenários reais
  { id: 25, text: 'Alguém te pergunta "o que você quer da vida?". Qual é sua reação mais honesta?', axes: ['avoidance', 'internal_conflict'], type: 'behavior_choice', options: ['Respondo com clareza e entusiasmo', 'Tenho uma ideia geral, mas falta convicção', 'Mudo de assunto ou dou uma resposta genérica', 'Sinto um aperto no peito e evito pensar nisso', 'Fico irritado porque não sei a resposta'] },
  { id: 26, text: 'Você recebe uma proposta de trabalho que paga bem, mas não tem nada a ver com o que te move. O que faz?', axes: ['identity_alignment', 'external_pressure'], type: 'behavior_choice', options: ['Recuso sem hesitar — dinheiro não compensa falta de sentido', 'Avalio com cuidado, mas priorizo alinhamento', 'Aceito temporariamente enquanto busco algo melhor', 'Aceito porque preciso e guardo a frustração', 'Aceito e tento me convencer de que está tudo bem'] },
  { id: 27, text: 'No final de um domingo, antes de começar a semana, como você se sente?', axes: ['fulfillment_level', 'emotional_engagement'], type: 'behavior_choice', options: ['Animado com o que vem pela frente', 'Neutro — a semana é só mais uma semana', 'Ansioso pensando em tudo que preciso fazer', 'Com um vazio que não consigo explicar', 'Com medo ou aversão ao que me espera'] },
  { id: 28, text: 'Quando você olha para suas conquistas até agora, o que sente?', axes: ['meaning_orientation', 'self_expression'], type: 'behavior_choice', options: ['Orgulho genuíno — construí algo que faz sentido', 'Satisfação parcial — fiz coisas boas mas falta algo', 'Indiferença — não me identifico com o que conquistei', 'Frustração — deveria estar mais longe', 'Vazio — nada disso realmente importa para mim'] },

  // frequency
  { id: 29, text: 'Você sente que está vivendo no piloto automático, sem propósito claro.', axes: ['fulfillment_level', 'avoidance'], type: 'frequency' },
  { id: 30, text: 'Você toma decisões baseadas no que os outros esperam de você.', axes: ['external_pressure', 'identity_alignment'], type: 'frequency' },

  // intensity
  { id: 31, text: 'A distância entre quem você é e como vive gera desconforto interior.', axes: ['internal_conflict', 'identity_alignment'], type: 'intensity' },
  { id: 32, text: 'Seu nível de engajamento emocional com suas atividades diárias.', axes: ['emotional_engagement', 'self_expression'], type: 'intensity' },
];
