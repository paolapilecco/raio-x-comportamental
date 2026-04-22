UPDATE public.global_ai_config
SET max_tokens = 8000,
    depth_level = 5,
    report_style = 'editorial denso',
    updated_at = now();

WITH t AS (
  SELECT id FROM public.test_modules WHERE slug = 'padrao-comportamental' LIMIT 1
)
UPDATE public.report_templates rt
SET sections = jsonb_build_object(
  'acts', jsonb_build_array(
    jsonb_build_object(
      'id', 'espelho',
      'title', 'ATO 1 — Espelho',
      'subtitle', 'Mostrar quem você realmente é, com profundidade clínica',
      'tone', 'Diagnóstico denso e analítico. Voz de analista comportamental sênior apresentando uma leitura editorial do sistema operacional psicológico do usuário, com argumentação sustentada e evidências concretas.',
      'slots', jsonb_build_array(
        jsonb_build_object(
          'key', 'leituraRapida', 'label', 'Leitura Rápida', 'format', 'prose',
          'maxSentences', 4, 'enabled', true,
          'instruction', 'Sintetize o padrão comportamental dominante em uma narrativa densa de abertura. Conecte o mecanismo central ao histórico provável e à consequência imediata observável. Use linguagem analítica, sem clichês.',
          'example', 'Seu padrão central opera por uma lógica de antecipação ansiosa: você se prepara para o pior cenário possível antes mesmo de tentar agir, e essa hipervigilância consome 70% da energia que deveria ir para a execução. O resultado é uma vida em modo de espera permanente, onde o esforço mental é altíssimo e a entrega real é fragmentada. O mecanismo se sustenta porque a preparação dá uma sensação falsa de controle — mas o controle é sobre o medo, não sobre o resultado. Você não está parada por preguiça nem por falta de capacidade; está parada porque seu sistema interno trata cada ação como uma potencial exposição ao fracasso.'
        ),
        jsonb_build_object(
          'key', 'origemPadrao', 'label', 'Origem do Padrão', 'format', 'prose',
          'maxSentences', 5, 'enabled', true,
          'instruction', 'Apresente uma hipótese clínica densa sobre como esse padrão se instalou: experiências formadoras prováveis, ambiente familiar/relacional, ganho secundário inconsciente (o que o padrão protege). NÃO seja vago — derive do núcleo diagnóstico (causaProvavel) e amplifique com mecanismo psicológico explicado em linguagem acessível.',
          'example', 'Esse padrão raramente nasce da personalidade — ele se instala como aprendizado emocional. Provavelmente, em algum ambiente formador (família crítica, escola exigente, relação onde o erro custava caro), você aprendeu que ser exposta a uma falha era mais doloroso do que não tentar. A mente, então, criou uma defesa elegante: paralisar antes do salto evita o impacto da queda. O ganho secundário, escondido sob a aparente paralisia, é proteção contra humilhação. O custo, invisível por anos, é uma vida vivida no rascunho.'
        ),
        jsonb_build_object(
          'key', 'chamaAtencao', 'label', 'O que mais chama atenção', 'format', 'alert',
          'maxSentences', 4, 'enabled', true,
          'instruction', 'Aponte a contradição mais reveladora entre intenção declarada e comportamento real, sustentada por evidências do dataBlock (respostas com score >= 80). Confronte sem agredir.',
          'example', 'A contradição mais reveladora do seu perfil está aqui: você se vê como exigente com qualidade, mas seus dados mostram que o que você chama de padrão alto é, na prática, o medo de entregar e ser julgada. A autocrítica que você acredita ser elevação acaba sendo o principal mecanismo que te impede de produzir qualquer coisa avaliável. Você fica em loop refinando o que ninguém vai ver. Isso não é perfeccionismo — é proteção disfarçada.'
        ),
        jsonb_build_object(
          'key', 'padraoRepetido', 'label', 'O padrão que se repete', 'format', 'prose',
          'maxSentences', 5, 'enabled', true,
          'instruction', 'Descreva o loop comportamental em prosa densa: gatilho -> comportamento -> justificativa interna -> consequência -> reforço da causa. Use o ciclo lógico do núcleo diagnóstico e dê um caso ilustrativo cotidiano dentro do mesmo bloco.',
          'example', 'O loop se desenha assim: surge uma tarefa importante (gatilho), você imediatamente começa a planejar todas as variáveis (comportamento), justifica internamente como estou só me organizando para fazer direito (narrativa), o prazo se aproxima e você executa em pânico ou abandona (consequência), reforçando a crença de que você não funciona sob pressão (reforço da causa). Esse mesmo ciclo apareceu na sua resposta sobre adiar conversas, sobre reescrever projetos, sobre revisitar decisões já tomadas. Não são episódios isolados — é um sistema operacional rodando há anos no mesmo loop.'
        ),
        jsonb_build_object(
          'key', 'comoAparece', 'label', 'Como aparece na rotina', 'format', 'prose',
          'maxSentences', 4, 'enabled', true,
          'instruction', 'Dê 2 micro-cenas do dia-a-dia onde o padrão aparece de forma quase invisível. Use situações específicas (e-mail, conversa, decisão de almoço) para tornar concreto.',
          'example', 'Aparece quando você abre um e-mail importante, lê três vezes, fecha sem responder e abre o Instagram. Aparece quando você decide o que comer e gasta 20 minutos analisando opções até não querer mais nada. Aparece quando alguém te pede um favor e você passa o dia inteiro com isso na cabeça antes de simplesmente dizer sim ou não. Cada uma dessas micro-pausas é o mesmo padrão se manifestando em escala miniatura.'
        )
      )
    ),
    jsonb_build_object(
      'id', 'confronto',
      'title', 'ATO 2 — Confronto',
      'subtitle', 'Mostrar o custo real e projetar o futuro',
      'tone', 'Confrontador, com peso analítico. Sem motivacional, sem catastrofismo. Apresente o custo de forma fria e precisa.',
      'slots', jsonb_build_array(
        jsonb_build_object(
          'key', 'triggers', 'label', 'Gatilhos principais', 'format', 'list',
          'maxSentences', 1, 'enabled', true,
          'instruction', 'Liste 4-5 gatilhos situacionais ESPECÍFICOS que ativam o ciclo. Cada gatilho deve ser uma cena reconhecível, não um conceito abstrato.',
          'example', 'Receber feedback antes de ter terminado a tarefa | Tomar decisão com informação parcial | Conversa difícil que exige confronto direto | Prazos sem cobrança externa explícita'
        ),
        jsonb_build_object(
          'key', 'analisePorArea', 'label', 'Análise por área da vida', 'format', 'cards',
          'maxSentences', 3, 'enabled', true,
          'instruction', 'Para CADA área (Carreira, Relacionamentos, Dinheiro, Saúde), produza análise densa de 2-3 frases mostrando: como o padrão se manifesta especificamente naquela área + qual o custo invisível que se acumula + um exemplo concreto. Retorne como ARRAY de objetos {pillar, impact}.',
          'example', '[{"pillar":"Carreira","impact":"Estagnação por entregas inconsistentes. Você é vista como talentosa mas pouco confiável. Promoções vão para quem entrega 70% da qualidade no prazo enquanto você revisa apresentação às 3h."},{"pillar":"Relacionamentos","impact":"Acumula ressentimento silencioso por não dizer o que precisa. Pessoas próximas sentem distância sem saber o motivo, e você se vê isolada em relações que pareciam íntimas."},{"pillar":"Dinheiro","impact":"Decisões financeiras adiadas indefinidamente. Investimentos não feitos, contratos não revisados — todas justificadas por preciso estudar mais antes."},{"pillar":"Saúde","impact":"Sono fragmentado por ruminação noturna. Tensão muscular crônica nos ombros e mandíbula. O corpo carrega o que a mente não processa de dia."}]'
        ),
        jsonb_build_object(
          'key', 'projecao6meses', 'label', 'Projeção em 6 meses', 'format', 'prose',
          'maxSentences', 4, 'enabled', true,
          'instruction', 'Compare dois cenários paralelos: (A) se mantiver o padrão atual e (B) se interromper agora. Seja específico, sem frases motivacionais. O contraste deve ser observável.',
          'example', 'Mantendo o padrão: você terá repetido aproximadamente 180 ciclos de adiamento-pânico-execução, e três projetos importantes continuarão como rascunhos. Interrompendo agora, no mesmo período: 4 a 6 projetos imperfeitos mas concluídos, feedback real recebido — positivo e negativo — que vai te ensinar mais que toda a ruminação dos últimos anos. A diferença entre os dois cenários não é sorte nem talento; é apenas escolher viver em entrega ao invés de em preparação.'
        ),
        jsonb_build_object(
          'key', 'projecao12meses', 'label', 'Projeção em 12 meses', 'format', 'alert',
          'maxSentences', 4, 'enabled', true,
          'instruction', 'Apresente o custo composto do padrão no horizonte de 1 ano: o que se acumula, o que se torna estrutural, o que ainda dá pra reverter. Tom factual, sem catastrofismo.',
          'example', 'Em 12 meses, o padrão deixa de ser hábito e vira identidade. Você passa a se apresentar — mesmo silenciosamente — como a pessoa que tem dificuldade de finalizar. Profissionalmente significa estagnação salarial e perda de credibilidade em círculos onde sua entrega importa. Pessoalmente, pessoas que confiavam em você começam a parar de pedir, e isso vai parecer alívio mas será o início do isolamento. Ainda é reversível, mas o custo de reverter agora é menor do que será daqui a 1 ano.'
        ),
        jsonb_build_object(
          'key', 'whatNotToDo', 'label', 'O que parar de fazer agora', 'format', 'list',
          'maxSentences', 1, 'enabled', true,
          'instruction', 'Liste 4 ações contraproducentes que parecem corretas mas reforçam o padrão.',
          'example', 'Pesquisar mais antes de começar a primeira versão | Pedir validação antes de cada decisão pequena | Reescrever e-mails que já estavam claros | Esperar se sentir pronta para agir'
        )
      )
    ),
    jsonb_build_object(
      'id', 'direcao',
      'title', 'ATO 3 — Direção',
      'subtitle', 'Mostrar o caminho de saída sustentado',
      'tone', 'Construtivo e específico. Sem motivacional vazio, sem promessas. Cada frase é uma instrução clara.',
      'slots', jsonb_build_array(
        jsonb_build_object(
          'key', 'corrigirPrimeiro', 'label', 'O ponto que destrava tudo', 'format', 'prose',
          'maxSentences', 4, 'enabled', true,
          'instruction', 'Identifique a alavanca única que, se mexida, destrava o resto. Explique POR QUE essa é a alavanca (mecanismo) e como começar a movê-la nesta semana.',
          'example', 'O ponto de alavanca não é ter mais disciplina nem se organizar melhor — é interromper a busca por preparação como pré-condição para agir. Toda vez que você sente que precisa estudar mais um pouco antes, esse é exatamente o momento de começar a executar mesmo sem se sentir pronta. A capacidade de executar incompleta é o músculo que destrava todos os outros: produtividade, autoestima, relacionamentos, dinheiro. Comece esta semana entregando uma coisa pela metade — propositalmente.'
        ),
        jsonb_build_object(
          'key', 'focoMudanca', 'label', 'O próximo passo', 'format', 'prose',
          'maxSentences', 3, 'enabled', true,
          'instruction', 'Resuma em 2-3 frases o foco da próxima semana. Aponte para as tarefasEstrategicas que vêm a seguir.',
          'example', 'Esta semana, foco em uma única coisa: praticar entregar antes de se sentir pronta. As três tarefas a seguir foram desenhadas exatamente para esse músculo — começando com consciência (perceber o padrão acontecendo), passando por interrupção (quebrar o ciclo no momento) e chegando em consolidação (criar um novo automatismo). Não pule etapas, mesmo que pareçam óbvias.'
        )
      )
    )
  ),
  'rules', jsonb_build_object(
    'maxTotalWords', 3500,
    'proportions', jsonb_build_object('espelho', 45, 'confronto', 35, 'direcao', 20),
    'narrativeVoice', 'Analista comportamental sênior. Editorial, denso, factual. Escreve como uma colunista séria de psicologia, não como coach.',
    'forbiddenTerms', jsonb_build_array(
      'zona de conforto', 'quebrar o ciclo', 'reprogramar sua mente',
      'potencial ilimitado', 'mindset de sucesso', 'seja a sua melhor versão',
      'mudar o chip', 'autossabotagem inconsciente', 'padrões limitantes',
      'destravar sua vida', 'abrace suas dores', 'cure seu interior',
      'energia do universo', 'frequência vibracional', 'mentalidade próspera',
      'jornada de autoconhecimento', 'busque equilíbrio', 'tenha consciência',
      'acredite em si', 'pratique o autocuidado', 'talvez', 'pode ser que', 'às vezes'
    ),
    'mandatoryElements', jsonb_build_array(
      'Citação direta de pelo menos uma resposta concreta da pessoa',
      'Conexão visível entre origem -> padrão atual -> consequência futura',
      'Pelo menos um exemplo cotidiano específico em cada bloco prose',
      'Tom analítico sustentado — sem motivacional barato'
    )
  )
),
output_rules = jsonb_build_object(
  'tone', 'analítico, denso, editorial, confrontador sem catastrofismo',
  'simplicityLevel', 4,
  'maxSentencesPerBlock', 6,
  'maxTotalBlocks', 14,
  'repetitionProhibited', true,
  'requiredBlocks', jsonb_build_array('leituraRapida', 'origemPadrao', 'chamaAtencao', 'padraoRepetido', 'analisePorArea', 'projecao6meses', 'projecao12meses', 'corrigirPrimeiro'),
  'forbiddenLanguage', jsonb_build_array(
    'zona de conforto', 'quebrar o ciclo', 'reprogramar sua mente',
    'potencial ilimitado', 'mindset de sucesso', 'seja a sua melhor versão',
    'mudar o chip', 'destravar sua vida', 'abrace suas dores',
    'frequência vibracional', 'mentalidade próspera', 'jornada de autoconhecimento'
  ),
  'emotionalArchitecture', 'Espelho denso (validação clínica) -> Confronto sustentado (custo composto, projeção) -> Direção precisa (alavanca única, próximo passo). Sem oscilar de tom.'
),
updated_at = now()
FROM t
WHERE rt.test_id = t.id;