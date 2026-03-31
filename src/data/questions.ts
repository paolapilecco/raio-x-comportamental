import { Question } from '@/types/diagnostic';

export const questions: Question[] = [
  // Execução instável
  { id: 1, text: 'Eu começo projetos ou mudanças com muita energia, mas perco o ritmo antes de concluir.', axes: ['unstable_execution'] },
  { id: 2, text: 'Minha motivação depende muito de como eu me sinto no dia.', axes: ['unstable_execution', 'emotional_self_sabotage'] },
  { id: 3, text: 'Tenho dificuldade em manter o mesmo padrão de esforço por mais de duas semanas seguidas.', axes: ['unstable_execution', 'low_routine_sustenance'] },

  // Autossabotagem emocional
  { id: 4, text: 'Quando estou prestes a avançar em algo importante, costumo encontrar um motivo para parar.', axes: ['emotional_self_sabotage'] },
  { id: 5, text: 'Já desisti de algo que estava funcionando por medo de não dar conta de manter.', axes: ['emotional_self_sabotage', 'paralyzing_perfectionism'] },
  { id: 6, text: 'Em momentos de pressão, minha primeira reação é recuar ou paralisar.', axes: ['emotional_self_sabotage', 'discomfort_escape'] },

  // Sobrecarga funcional
  { id: 7, text: 'Estou sempre ocupado, mas sinto que não avanço de verdade.', axes: ['functional_overload'] },
  { id: 8, text: 'Tenho dificuldade em dizer não e acabo acumulando mais do que consigo dar conta.', axes: ['functional_overload', 'validation_dependency'] },
  { id: 9, text: 'Minha mente está constantemente planejando, pensando ou revisando coisas.', axes: ['functional_overload', 'excessive_self_criticism'] },

  // Fuga por desconforto
  { id: 10, text: 'Quando algo me gera desconforto, prefiro trocar de atividade do que enfrentar.', axes: ['discomfort_escape'] },
  { id: 11, text: 'Adio tarefas importantes com frequência, mesmo sabendo que isso me prejudica.', axes: ['discomfort_escape', 'unstable_execution'] },
  { id: 12, text: 'Uso distrações (celular, redes sociais, séries) para não lidar com o que precisa ser feito.', axes: ['discomfort_escape'] },

  // Perfeccionismo travante
  { id: 13, text: 'Só começo algo quando sinto que tenho condições ideais para fazer bem feito.', axes: ['paralyzing_perfectionism'] },
  { id: 14, text: 'Prefiro não entregar nada do que entregar algo que considero abaixo do meu padrão.', axes: ['paralyzing_perfectionism', 'excessive_self_criticism'] },
  { id: 15, text: 'Gasto tempo demais refinando detalhes e acabo atrasando o que importa.', axes: ['paralyzing_perfectionism', 'functional_overload'] },

  // Dependência de validação
  { id: 16, text: 'Antes de tomar uma decisão, costumo buscar a opinião de outras pessoas.', axes: ['validation_dependency'] },
  { id: 17, text: 'Quando alguém critica algo que fiz, tenho dificuldade em separar a crítica da minha identidade.', axes: ['validation_dependency', 'excessive_self_criticism'] },
  { id: 18, text: 'Faço muitas coisas mais para agradar os outros do que por vontade própria.', axes: ['validation_dependency'] },

  // Autocrítica excessiva
  { id: 19, text: 'Mesmo quando faço algo bom, costumo focar no que poderia ter sido melhor.', axes: ['excessive_self_criticism'] },
  { id: 20, text: 'Tenho uma voz interna muito dura que me cobra o tempo todo.', axes: ['excessive_self_criticism', 'emotional_self_sabotage'] },
  { id: 21, text: 'Sinto culpa quando descanso ou quando não sou produtivo.', axes: ['excessive_self_criticism', 'functional_overload'] },

  // Baixa sustentação de rotina
  { id: 22, text: 'Consigo criar bons planos, mas falho na hora de manter a execução diária.', axes: ['low_routine_sustenance', 'unstable_execution'] },
  { id: 23, text: 'Minha rotina muda muito de uma semana para outra.', axes: ['low_routine_sustenance'] },
  { id: 24, text: 'Sinto que preciso de algo externo (prazo, cobrança, urgência) para realmente agir.', axes: ['low_routine_sustenance', 'discomfort_escape'] },
];
