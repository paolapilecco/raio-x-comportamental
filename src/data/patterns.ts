import { PatternDefinition, PatternKey } from '@/types/diagnostic';

export const patternDefinitions: Record<PatternKey, PatternDefinition> = {
  unstable_execution: {
    key: 'unstable_execution',
    label: 'Execução Instável',
    description: 'Você inicia com intensidade, mas não consegue sustentar o ritmo. Seus ciclos de ação são curtos e dependem de estados emocionais — quando a empolgação passa, a energia também vai. Isso cria uma sensação constante de começar do zero.',
    mechanism: 'A energia inicial vem de um impulso emocional, não de uma estrutura real. Quando o desconforto natural do processo aparece, não há sistema interno que sustente a ação. O resultado é uma oscilação constante entre picos de produtividade e quedas abruptas.',
    contradiction: 'Você quer resultados consistentes, mas opera em ciclos de intensidade e abandono. A intenção é de longo prazo, mas o comportamento funciona em sprints emocionais curtos.',
    impact: 'Projetos inacabados se acumulam. A autoconfiança diminui a cada ciclo interrompido. Decisões ficam instáveis porque falta base de continuidade. A sensação de progresso real é rara.',
    direction: 'Seu primeiro passo não é criar mais metas. É aprender a funcionar sem depender de motivação. Construa um sistema mínimo que você consiga manter mesmo nos dias ruins.',
  },
  emotional_self_sabotage: {
    key: 'emotional_self_sabotage',
    label: 'Autossabotagem Emocional',
    description: 'Você tende a interromper seu próprio avanço em momentos críticos. Não é preguiça — é um mecanismo emocional que entra em ação quando a possibilidade de sucesso (ou fracasso) se torna real demais.',
    mechanism: 'Existe um desconforto profundo com o que pode acontecer se você realmente avançar: medo de não sustentar, de ser exposto, de descobrir que não é suficiente. A sabotagem funciona como proteção inconsciente contra esses cenários.',
    contradiction: 'Você deseja avançar, mas seu sistema emocional interpreta o avanço como ameaça. Quanto mais perto do resultado, maior a chance de recuar.',
    impact: 'Oportunidades são perdidas de forma repetitiva. Relações profissionais e pessoais são afetadas pela inconsistência. A frustração se acumula e reforça a crença de que "não funciona para mim".',
    direction: 'Não tente vencer a sabotagem com força de vontade. Comece reconhecendo o momento exato em que ela entra. Identifique o gatilho emocional antes de tentar mudar o comportamento.',
  },
  functional_overload: {
    key: 'functional_overload',
    label: 'Sobrecarga Funcional',
    description: 'Você opera no limite da capacidade, acumulando tarefas, demandas e responsabilidades. A sensação de estar ocupado substitui a sensação de estar avançando. Sua mente raramente para.',
    mechanism: 'A sobrecarga funciona como uma forma de evitar o vazio. Enquanto você está ocupado, não precisa confrontar questões mais profundas: prioridades reais, limites pessoais, medos de inadequação. O excesso se torna um escudo.',
    contradiction: 'Você quer mais clareza e foco, mas continua adicionando demandas ao seu dia. Busca leveza, mas opera como se parar fosse um luxo.',
    impact: 'A qualidade do que você entrega cai. Decisões se tornam reativas. O corpo e a mente acumulam fadiga crônica. Relacionamentos são afetados pelo esgotamento. Você perde o acesso à criatividade e à intuição.',
    direction: 'Seu problema não é falta de produtividade — é excesso de ocupação sem filtro. O primeiro movimento é cortar, não adicionar. Elimine antes de organizar.',
  },
  discomfort_escape: {
    key: 'discomfort_escape',
    label: 'Fuga por Desconforto',
    description: 'Quando uma tarefa gera tensão, tédio ou vulnerabilidade, seu sistema busca alívio imediato. Você troca o importante pelo confortável, não por preguiça, mas por uma sensibilidade elevada ao desconforto.',
    mechanism: 'Seu sistema nervoso foi condicionado a evitar o desconforto antes que ele se intensifique. A fuga acontece de forma automática — celular, redes sociais, tarefas menores, qualquer coisa que ofereça alívio rápido.',
    contradiction: 'Você sabe exatamente o que precisa fazer. Mas saber não é suficiente quando o corpo e a mente estão programados para escapar antes que a ação aconteça.',
    impact: 'Tarefas importantes se acumulam. A procrastinação gera culpa, que gera mais fuga. O ciclo se autoalimenta. Com o tempo, a confiança na própria capacidade de execução diminui drasticamente.',
    direction: 'Não tente eliminar o desconforto — tente aumentar sua tolerância a ele. Comece com doses mínimas: 10 minutos na tarefa difícil antes de qualquer fuga. O objetivo não é perfeição, é permanência.',
  },
  paralyzing_perfectionism: {
    key: 'paralyzing_perfectionism',
    label: 'Perfeccionismo Travante',
    description: 'Seu padrão de exigência é tão alto que ele se torna o próprio obstáculo. Você não falha por falta de capacidade — você trava por medo de não atingir o nível que você mesmo impôs.',
    mechanism: 'O perfeccionismo funciona como defesa contra a vulnerabilidade. Se você não começa, não pode falhar. Se não entrega, não pode ser julgado. O padrão ideal se torna uma barreira permanente entre a intenção e a ação.',
    contradiction: 'Você quer excelência, mas a busca por perfeição impede a entrega. O resultado é que nada sai — e a inação é pior do que qualquer versão imperfeita.',
    impact: 'Entregas atrasam constantemente. O tempo é consumido em detalhes que outros nem notam. Oportunidades passam enquanto você refina. A frustração cresce porque a qualidade interna nunca é alcançada.',
    direction: 'Troque a pergunta "está bom o suficiente?" por "está feito?". Permita-se entregar versões imperfeitas. A excelência vem da iteração, não da preparação infinita.',
  },
  validation_dependency: {
    key: 'validation_dependency',
    label: 'Dependência de Validação',
    description: 'Suas decisões, ações e até sua autoestima dependem significativamente da aprovação ou reconhecimento externo. Sem essa validação, a dúvida se instala e a ação trava.',
    mechanism: 'Existe uma dificuldade em confiar na própria percepção. A opinião do outro funciona como âncora de segurança. Sem ela, qualquer escolha parece arriscada demais. Isso gera paralisia decisória e comportamento adaptativo excessivo.',
    contradiction: 'Você quer autonomia e confiança própria, mas continua terceirizando a validação das suas escolhas. Cada vez que busca aprovação externa, enfraquece o músculo da decisão interna.',
    impact: 'Decisões são adiadas esperando confirmação. Relações se tornam desequilibradas. Você molda seu comportamento para agradar, perdendo contato com o que realmente quer. A identidade fica difusa.',
    direction: 'Comece tomando uma pequena decisão por dia sem consultar ninguém. Não precisa ser algo grande — precisa ser seu. Reconstrua a confiança no seu próprio julgamento.',
  },
  excessive_self_criticism: {
    key: 'excessive_self_criticism',
    label: 'Autocrítica Excessiva',
    description: 'Sua voz interna é implacável. Ela não reconhece conquistas, amplifica falhas e transforma qualquer resultado em evidência de insuficiência. Você vive sob julgamento constante — o seu próprio.',
    mechanism: 'A autocrítica se instalou como um sistema de controle: se você se cobrar o suficiente, talvez evite o erro. Mas o efeito é inverso — a cobrança paralisa, esgota e impede o risco necessário para crescer.',
    contradiction: 'Você quer se sentir capaz e confiante, mas seu diálogo interno repete constantemente que você não é o bastante. A busca por melhoria se transforma em autopunição crônica.',
    impact: 'A autoconfiança é sistematicamente corroída. O descanso gera culpa. A celebração é impossível. Relacionamentos são afetados pela insegurança projetada. O esgotamento emocional é constante.',
    direction: 'Você não precisa silenciar a autocrítica — precisa parar de tratá-la como verdade absoluta. Comece registrando o que fez de concreto no dia, sem julgamento. Fatos, não interpretações.',
  },
  low_routine_sustenance: {
    key: 'low_routine_sustenance',
    label: 'Baixa Sustentação de Rotina',
    description: 'Você sabe criar estruturas, mas não consegue mantê-las. Sua rotina é volátil — funciona por alguns dias e depois se dissolve. O problema não está no planejamento, está na manutenção.',
    mechanism: 'A rotina exige tolerância ao tédio e ao repetitivo. Quando a novidade desaparece, o interesse vai junto. Sem um gatilho externo (prazo, urgência, cobrança), o sistema interno não sustenta a ação.',
    contradiction: 'Você valoriza disciplina e consistência, mas seu comportamento reflete o oposto. Há um abismo entre o que você planeja e o que você realmente executa no dia a dia.',
    impact: 'Hábitos nunca se consolidam. Cada semana parece um recomeço. A sensação de instabilidade mina a confiança. Resultados que dependem de continuidade nunca se materializam.',
    direction: 'Não tente montar a rotina ideal. Monte a rotina mínima — aquela que você consegue manter até no pior dia. Depois, expanda. Consistência vem do mínimo sustentável, não do máximo desejável.',
  },
};

export const patternLabels: Record<PatternKey, string> = Object.fromEntries(
  Object.entries(patternDefinitions).map(([key, def]) => [key, def.label])
) as Record<PatternKey, string>;
