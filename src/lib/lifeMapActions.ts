/**
 * Generates 3 practical, simple actions for a life area scoring below 70%.
 * Rules: no theory, no motivational language, focus on behavior and routine.
 * Actions must be realistic and achievable within 60 days.
 */

const ACTION_BANK: Record<string, string[]> = {
  saude: [
    'Caminhe 20 minutos pelo menos 4 dias por semana — pode ser no bairro mesmo.',
    'Beba 2 litros de água por dia. Use uma garrafa marcada para acompanhar.',
    'Durma e acorde no mesmo horário todos os dias, inclusive nos fins de semana.',
    'Troque uma refeição ultra-processada por dia por algo preparado em casa.',
    'Reserve 10 minutos antes de dormir sem tela — só silêncio ou leitura leve.',
  ],
  financas: [
    'Anote todos os gastos durante 30 dias — sem julgar, só registrar.',
    'Cancele uma assinatura que você não usa há mais de 30 dias.',
    'Separe um valor fixo por semana (mesmo que pequeno) numa conta separada.',
    'Antes de comprar algo acima de R$50, espere 48 horas. Se ainda quiser, compre.',
    'Defina um limite semanal para gastos variáveis e acompanhe pelo app do banco.',
  ],
  relacionamentos: [
    'Escolha uma pessoa importante e converse com ela 15 minutos por semana sem celular.',
    'Quando sentir incômodo com alguém, diga o que sentiu em até 24 horas.',
    'Pare de responder mensagens no automático — leia, pense e responda com atenção.',
    'Pergunte "como você está de verdade?" para uma pessoa por semana.',
    'Diga não para um compromisso social que você só aceita por obrigação.',
  ],
  trabalho: [
    'Comece o dia listando as 3 tarefas mais importantes — faça a mais difícil primeiro.',
    'A cada 90 minutos de trabalho, pare 10 minutos. Levante, respire, mude de ambiente.',
    'Desative notificações do celular durante blocos de foco de pelo menos 1 hora.',
    'No fim do expediente, anote o que ficou pendente para não carregar na cabeça.',
    'Diga não para pelo menos uma reunião por semana que poderia ser um e-mail.',
  ],
  emocional: [
    'Quando sentir irritação ou ansiedade, pare 60 segundos e respire fundo 5 vezes.',
    'Escreva 3 frases por dia sobre como você se sentiu — sem filtrar nem corrigir.',
    'Identifique uma situação que te irrita repetidamente e escreva o que está por trás dela.',
    'Reserve 15 minutos por dia para fazer algo que te dá prazer — sem culpa.',
    'Antes de reagir a um conflito, conte até 10 em silêncio. Depois decida o que fazer.',
  ],
  autoconfianca: [
    'Anote uma coisa por dia que você fez bem — por menor que pareça.',
    'Quando pensar "não sou capaz", pergunte: "que evidência eu tenho disso?"',
    'Aceite um elogio sem minimizar. Diga apenas "obrigado".',
    'Faça uma coisa por semana que te dá um pouco de medo — pode ser pequena.',
    'Pare de pedir desculpa por coisas que não são sua culpa.',
  ],
  proposito: [
    'Escreva em uma frase: "O que eu quero estar fazendo daqui a 2 anos?"',
    'Liste 3 atividades que te fazem perder a noção do tempo — faça uma delas esta semana.',
    'Converse com alguém que trabalha numa área que te interessa. Só ouvir.',
    'Reserve 30 minutos por semana para estudar ou experimentar algo novo.',
    'Pergunte a si mesmo: "Se dinheiro não fosse problema, o que eu faria?"',
  ],
  lazer: [
    'Escolha uma atividade de lazer por semana que não envolva tela.',
    'Bloqueie 2 horas no fim de semana só para você — sem compromisso com ninguém.',
    'Resgate um hobby que você abandonou. Comece com 15 minutos por semana.',
    'Saia de casa pelo menos uma vez por semana para algo que não seja trabalho.',
    'Diga não para uma obrigação de fim de semana e use o tempo para descansar.',
  ],
  familia: [
    'Reserve uma refeição por semana para comer junto com a família, sem celular na mesa.',
    'Pergunte a um familiar próximo como ele está — e ouça sem dar conselho.',
    'Resolva uma pendência pequena que está gerando atrito em casa.',
    'Planeje um programa simples com a família uma vez por mês — não precisa ser caro.',
    'Quando surgir um conflito, diga o que sente em vez de acusar o outro.',
  ],
  espiritualidade: [
    'Reserve 10 minutos por dia em silêncio — sem celular, sem música, sem ninguém.',
    'Escreva uma vez por semana sobre algo pelo qual você é grato.',
    'Faça algo por alguém sem esperar nada em troca — uma vez por semana.',
    'Leia uma página por dia de algo que te faz refletir sobre a vida.',
    'Passe pelo menos 20 minutos por semana na natureza — parque, praça, jardim.',
  ],
  desenvolvimento: [
    'Leia ou ouça 15 minutos por dia sobre algo que quer aprender.',
    'Defina uma habilidade específica para desenvolver nos próximos 60 dias.',
    'Peça feedback a alguém de confiança sobre um ponto que quer melhorar.',
    'Anote as 3 coisas mais importantes que aprendeu na semana.',
    'Substitua 30 minutos de rede social por dia por conteúdo que te faz crescer.',
  ],
};

// Fallback actions for unknown area keys
const GENERIC_ACTIONS: string[] = [
  'Reserve 15 minutos por dia para cuidar dessa área — comece com o mais simples.',
  'Escolha uma coisa concreta para mudar esta semana. Só uma. E faça.',
  'No fim de cada semana, anote: o que fiz de diferente nessa área?',
  'Converse com alguém que lida bem com essa área. Pergunte o que funciona no dia a dia.',
  'Defina um mini-objetivo para 30 dias. Algo que você consegue medir.',
];

/**
 * Pick 3 actions for a given area key and percentage.
 * Lower percentages get more urgent/foundational actions (earlier in the list).
 */
export function generateAreaActions(areaKey: string, percentage: number): string[] {
  const normalized = areaKey.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');

  // Try to match known keys
  const bank = Object.entries(ACTION_BANK).find(([key]) => normalized.includes(key));
  const actions = bank ? bank[1] : GENERIC_ACTIONS;

  // For very low scores (<40%), pick from the beginning (foundational actions)
  // For moderate scores (40-69%), pick from the middle/end (refinement actions)
  if (percentage < 40) {
    return actions.slice(0, 3);
  }
  // Rotate so moderate scores get slightly different actions
  const start = Math.min(1, actions.length - 3);
  return actions.slice(start, start + 3);
}
