import { Question } from '@/types/diagnostic';

type QuestionType = 'likert' | 'behavior_choice' | 'frequency' | 'intensity';

interface ExtendedQuestion extends Question {
  type?: QuestionType;
  options?: string[];
}

export const questions: ExtendedQuestion[] = [
  // Execução instável — likert
  { id: 1, text: 'Eu começo projetos ou mudanças com muita energia, mas perco o ritmo antes de concluir.', axes: ['unstable_execution'] },
  { id: 2, text: 'Minha motivação depende muito de como eu me sinto no dia.', axes: ['unstable_execution', 'emotional_self_sabotage'] },
  { id: 3, text: 'Tenho dificuldade em manter o mesmo padrão de esforço por mais de duas semanas seguidas.', axes: ['unstable_execution', 'low_routine_sustenance'] },

  // Autossabotagem emocional — likert
  { id: 4, text: 'Quando estou prestes a avançar em algo importante, costumo encontrar um motivo para parar.', axes: ['emotional_self_sabotage'] },
  { id: 5, text: 'Já desisti de algo que estava funcionando por medo de não dar conta de manter.', axes: ['emotional_self_sabotage', 'paralyzing_perfectionism'] },
  { id: 6, text: 'Em momentos de pressão, minha primeira reação é recuar ou paralisar.', axes: ['emotional_self_sabotage', 'discomfort_escape'] },

  // Sobrecarga funcional — likert
  { id: 7, text: 'Estou sempre ocupado, mas sinto que não avanço de verdade.', axes: ['functional_overload'] },
  { id: 8, text: 'Tenho dificuldade em dizer não e acabo acumulando mais do que consigo dar conta.', axes: ['functional_overload', 'validation_dependency'] },
  { id: 9, text: 'Minha mente está constantemente planejando, pensando ou revisando coisas.', axes: ['functional_overload', 'excessive_self_criticism'] },

  // Fuga por desconforto — likert
  { id: 10, text: 'Quando algo me gera desconforto, prefiro trocar de atividade do que enfrentar.', axes: ['discomfort_escape'] },
  { id: 11, text: 'Adio tarefas importantes com frequência, mesmo sabendo que isso me prejudica.', axes: ['discomfort_escape', 'unstable_execution'] },
  { id: 12, text: 'Uso distrações (celular, redes sociais, séries) para não lidar com o que precisa ser feito.', axes: ['discomfort_escape'] },

  // Perfeccionismo travante — likert
  { id: 13, text: 'Só começo algo quando sinto que tenho condições ideais para fazer bem feito.', axes: ['paralyzing_perfectionism'] },
  { id: 14, text: 'Prefiro não entregar nada do que entregar algo que considero abaixo do meu padrão.', axes: ['paralyzing_perfectionism', 'excessive_self_criticism'] },
  { id: 15, text: 'Gasto tempo demais refinando detalhes e acabo atrasando o que importa.', axes: ['paralyzing_perfectionism', 'functional_overload'] },

  // Dependência de validação — likert
  { id: 16, text: 'Antes de tomar uma decisão, costumo buscar a opinião de outras pessoas.', axes: ['validation_dependency'] },
  { id: 17, text: 'Quando alguém critica algo que fiz, tenho dificuldade em separar a crítica da minha identidade.', axes: ['validation_dependency', 'excessive_self_criticism'] },
  { id: 18, text: 'Faço muitas coisas mais para agradar os outros do que por vontade própria.', axes: ['validation_dependency'] },

  // Autocrítica excessiva — likert
  { id: 19, text: 'Mesmo quando faço algo bom, costumo focar no que poderia ter sido melhor.', axes: ['excessive_self_criticism'] },
  { id: 20, text: 'Tenho uma voz interna muito dura que me cobra o tempo todo.', axes: ['excessive_self_criticism', 'emotional_self_sabotage'] },
  { id: 21, text: 'Sinto culpa quando descanso ou quando não sou produtivo.', axes: ['excessive_self_criticism', 'functional_overload'] },

  // Baixa sustentação de rotina — likert
  { id: 22, text: 'Consigo criar bons planos, mas falho na hora de manter a execução diária.', axes: ['low_routine_sustenance', 'unstable_execution'] },
  { id: 23, text: 'Minha rotina muda muito de uma semana para outra.', axes: ['low_routine_sustenance'] },
  { id: 24, text: 'Sinto que preciso de algo externo (prazo, cobrança, urgência) para realmente agir.', axes: ['low_routine_sustenance', 'discomfort_escape'] },

  // behavior_choice — cenários reais
  { id: 25, text: 'Você tem uma meta importante para cumprir esta semana. Quando chega segunda-feira, o que mais se parece com você?', axes: ['unstable_execution', 'low_routine_sustenance'], type: 'behavior_choice', options: ['Começo com toda energia e foco, sem hesitar', 'Planejo detalhadamente antes de agir', 'Começo empolgado mas perco o ritmo no meio da semana', 'Adio para o último momento e faço sob pressão', 'Troco a meta por algo que parece mais interessante'] },
  { id: 26, text: 'Alguém faz uma crítica ao seu trabalho. Qual é sua reação mais honesta?', axes: ['excessive_self_criticism', 'validation_dependency'], type: 'behavior_choice', options: ['Avalio com calma se faz sentido e sigo em frente', 'Fico pensando nisso por horas tentando entender', 'Sinto raiva ou irritação imediata', 'Me questiono se sou realmente capaz', 'Ignoro completamente e sigo fazendo do meu jeito'] },
  { id: 27, text: 'Você está prestes a finalizar um projeto que está quase pronto. O que acontece?', axes: ['paralyzing_perfectionism', 'emotional_self_sabotage'], type: 'behavior_choice', options: ['Entrego sem hesitar, sabendo que está bom o suficiente', 'Reviso mais uma vez e entrego', 'Fico revisando detalhes e acabo atrasando', 'Começo a duvidar da qualidade e quase desisto', 'Abandono e começo outro projeto novo'] },
  { id: 28, text: 'Você tem uma tarde livre sem compromissos. O que mais se parece com o que você faria?', axes: ['discomfort_escape', 'functional_overload'], type: 'behavior_choice', options: ['Descanso sem culpa e aproveito o tempo', 'Uso para adiantar tarefas importantes', 'Fico scrollando o celular sem perceber as horas passarem', 'Preencho com atividades para não ficar à toa', 'Sinto ansiedade por não estar sendo produtivo'] },

  // frequency — frequência dos padrões
  { id: 29, text: 'Você procrastina tarefas que sabe que são importantes.', axes: ['discomfort_escape', 'unstable_execution'], type: 'frequency' },
  { id: 30, text: 'Você se compara negativamente com outras pessoas.', axes: ['excessive_self_criticism', 'validation_dependency'], type: 'frequency' },
  { id: 31, text: 'Você aceita compromissos que não quer por dificuldade em dizer não.', axes: ['validation_dependency', 'functional_overload'], type: 'frequency' },
  { id: 32, text: 'Você abandona uma rotina que estava funcionando antes de completar 30 dias.', axes: ['low_routine_sustenance', 'unstable_execution'], type: 'frequency' },
];
