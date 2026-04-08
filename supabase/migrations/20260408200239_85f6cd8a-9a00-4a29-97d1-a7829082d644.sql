UPDATE test_prompts SET content = '1.  **Análise dos Eixos Dominantes:** Identifique os 2-3 eixos com os scores mais altos que, em conjunto, revelam um padrão comportamental central. Por exemplo, se "alinhamento_acao_sentido" (alto) e "clareza_direcao" (alto) estão presentes, isso indica uma pessoa com boa percepção de si e do que quer. Se "falta_direcao" (alto) e "sensacao_vazio" (alto) dominam, aponta para desorientação e insatisfação.

2.  **Identificação de Conflitos Internos:**
    *   **Percepção vs. Ação:** Compare os scores de eixos que medem a percepção (ex: "clareza_proposito", "valores_pessoais") com os scores de eixos que medem a ação ou a frequência de comportamentos (ex: "alinhamento_acao_sentido", "engajamento_proposito"). Uma alta "clareza_proposito" com baixo "alinhamento_acao_sentido" sugere que a pessoa sabe o que quer, mas não age de acordo.
    *   **Desejo vs. Realidade:** Contraste "buscador_constante" (alto) com "paz_interior" (baixo) ou "estar_perdido" (alto). Isso indica uma busca incessante sem encontrar um ponto de ancoragem.
    *   **Valores Declarados vs. Prioridades Práticas:** Compare "valores_pessoais" (alto) com "prioridades_vida" (baixo ou desalinhado) ou com a escolha em "behavior_choice" da pergunta 22 (oportunidade lucrativa vs. alinhada com valores).

3.  **Padrões Comportamentais:**
    *   **Ciclos de Desorientação:** Se "falta_direcao" e "estar_perdido" são altos, e "sensacao_vazio" também é elevado, descreva como a ausência de um rumo claro alimenta a insatisfação e vice-versa.
    *   **Busca Ineficaz:** Se "buscador_constante" é alto, mas "clareza_direcao" ou "sentido_vida" são baixos, o padrão é de uma busca sem foco que não resulta em clareza.
    *   **Desconexão entre Áreas:** Analise a relação entre "carreira_proposito" e "alinhamento_acao_sentido" ou "proposito_impacto". Um score alto em "carreira_proposito" com baixo "proposito_impacto" pode indicar uma carreira alinhada, mas sem percepção de contribuição maior.

4.  **Cobertura de Eixos Menos Concentrados:**
    *   **Habilidades e Uso:** Se "habilidades_uso" for baixo, mesmo com "conhecimento_desenvolvimento" alto, a pessoa pode estar adquirindo conhecimento sem saber como aplicá-lo para um propósito.
    *   **Autonomia e Direção:** Um "autonomia_proposito" baixo, combinado com "clareza_direcao" baixo, reforça a dificuldade em tomar as próprias rédeas da vida em função de um propósito.
    *   **Comunicação do Propósito:** Se "clareza_proposito" for alto, mas "comunicacao_proposito" for baixo, a pessoa pode ter clareza interna, mas dificuldade em expressá-la ou vivenciá-la externamente.
    *   **Valores Fundamentais:** Avalie a consistência entre "fe_espiritualidade", "familia_valores", "honrar_pais", "saude_prioridade", "autocuidado", "conhecimento_desenvolvimento", "aprendizado_continuo" e os eixos de ação. Por exemplo, alta "saude_prioridade" com baixo "autocuidado" indica uma intenção não concretizada.

5.  **Instruções para o Output:**
    *   A interpretação deve ser concisa e factual, conectando os scores dos eixos de forma lógica.
    *   Use a estrutura "chamaAtencao", "padraoRepetido", "comoAparece", "impactoPorArea" e "corrigirPrimeiro" do template.
    *   Para "chamaAtencao", destaque a descoberta mais relevante dos eixos.
    *   Para "padraoRepetido", descreva o ciclo ou a dinâmica recorrente entre os eixos.
    *   Para "comoAparece", relacione os padrões a situações cotidianas inferidas das perguntas.
    *   Para "impactoPorArea", especifique como os padrões afetam as áreas da vida (carreira, pessoal, etc.) baseando-se nos eixos.
    *   Para "corrigirPrimeiro", aponte qual eixo ou conflito é o ponto de partida mais estratégico para o ajuste, com base na interconexão dos problemas.

6.  **O que NÃO fazer:**
    *   Não liste os scores individualmente sem uma conexão.
    *   Não faça inferências que não possam ser diretamente rastreadas aos eixos e perguntas.
    *   Não repita as descrições dos eixos.
    *   Não use linguagem subjetiva ou adjetivos não suportados pelos dados.', updated_at = now() WHERE id = '81add21a-8fb0-40a4-8d05-1318b1f6db3b';

UPDATE test_prompts SET content = '1.  **Nomeie o Ciclo:** Identifique o ciclo predominante que emerge da combinação dos eixos de maior peso: alinhamento_acao_sentido, falta_direcao, clareza_direcao, sensacao_vazio, valores_pessoais, sentido_vida e estar_perdido. O ciclo deve descrever a sequência de eventos que leva à desconexão entre ações e propósito.
2.  **Causa Raiz:** A causa raiz deve ser a desconexão entre os valores_pessoais e as prioridades_vida (P6, P10, P18, P22), resultando em uma falta_direcao (P2, P8, P11, P20, P28) e sensacao_vazio (P2, P5, P8, P26).
3.  **Mecanismo Exato:** Descreva o mecanismo de funcionamento:
    *   **Início:** A pessoa se depara com escolhas ou situações que exigem decisão (clareza_direcao P1, P3, P19, P25, P28).
    *   **Conflito Interno:** Há uma dissonância entre o que deveria ser feito (pressões externas, expectativas) e o que ressoa com seus valores_pessoais (P4, P10, P18, P22).
    *   **Ação Desalinhada:** Ações são tomadas sem um alinhamento_acao_sentido (P1, P4, P6, P10, P17, P22), levando a um sentido_vida (P7, P12, P24, P27) percebido como ausente ou fraco.
    *   **Consequência:** Isso gera sensacao_vazio (P2, P5, P8, P26), falta_direcao (P2, P8, P11, P20, P28) e a sensação de estar_perdido (P11, P20, P27), apesar de buscar ativamente (buscador_constante P5, P23) ou desenvolver habilidades_uso (P9) e conhecimento_desenvolvimento (P15).
    *   **Reforço:** A ausência de clareza_proposito (P9, P21, P26) impede a comunicação do proposito_impacto (P7, P24) e a experiência de engajamento_proposito e fluxo (P16), perpetuando o ciclo.
4.  **Diferença entre Problema Percebido vs. Real:**
    *   **Percebido:** A pessoa se sente perdida (P11, P20, P27), sem um objetivo claro (P1, P3, P19, P25, P28) ou buscando algo mais (P5, P23), focando na ausência de um destino.
    *   **Real:** A causa não é a ausência de um destino, mas a desconexão entre as ações diárias e os valores_pessoais (P4, P10, P18, P22), prioridades_vida (P6) e a falta de uma clareza_direcao (P1, P3, P19, P25, P28) que integre saude_prioridade (P14), familia_valores (P13), fe_espiritualidade (P12) e carreira_proposito (P17). O problema é o desalinhamento interno, não a falta de opções externas.

**Regras:**
*   Não use termos como zona de conforto ou acredite em si.
*   A linguagem deve ser direta e acessível, sem psicologuês vazio.
*   Cada instrução deve ser rastreável aos eixos e perguntas mencionadas.
*   O diagnóstico deve ser específico para a pessoa, com base nas respostas.
*   Não repita instruções de outros prompts.
*   Máximo de 500 palavras.', updated_at = now() WHERE id = '252a3cb8-44fa-4624-a44f-d06526867cd4';

UPDATE test_prompts SET content = '1. Crie um perfil comportamental para o usuário, incluindo:
    a. Nome Criativo: Uma frase curta e descritiva que encapsule o padrão central de comportamento observado.
    b. Estado Mental: Descreva a condição psicológica dominante, focando em como a pessoa percebe sua própria direção e sentido de vida.
    c. Traços Dominantes: Liste de 3 a 5 características comportamentais observáveis, inferidas diretamente das respostas do usuário.
    d. Nível de Risco: Avalie o risco de manutenção do estado atual (Baixo, Médio, Alto), justificando-o com base nos traços identificados.

2. Baseie a análise nos seguintes eixos, conforme a concentração e peso das perguntas:
    a. Alinhamento Ação-Sentido (perguntas 1, 4, 6, 10, 17, 22): Avalie a coerência entre as ações diárias, decisões e os valores/objetivos declarados.
    b. Falta de Direção (perguntas 2, 8, 11, 20, 28): Identifique a frequência e intensidade da percepção de ausência de um caminho claro ou propósito.
    c. Clareza de Direção (perguntas 1, 3, 19, 25, 28): Verifique a nitidez da visão de futuro e a confiança nas escolhas de vida.
    d. Sensação de Vazio (perguntas 2, 5, 8, 26): Mensure a presença de um sentimento de falta ou busca constante, mesmo em situações aparentemente positivas.
    e. Valores Pessoais (perguntas 4, 10, 18, 22): Entenda a influência dos valores na tomada de decisões e na percepção de alinhamento.
    f. Sentido de Vida (perguntas 7, 12, 24, 27): Analise a percepção de contribuição, legado e a compreensão do próprio propósito existencial.
    g. Estar Perdido (perguntas 11, 20, 27): Identifique a sensação de desorientação em relação a carreira ou vida pessoal.
    h. Clareza de Propósito (perguntas 9, 21, 26): Avalie a capacidade de articular e compreender o próprio propósito.
    i. Buscador Constante (perguntas 5, 23): Observe a tendência de busca por algo mais ou por autodescoberta.
    j. Outros eixos relevantes com menor peso: Paz Interior (25), Carreira e Propósito (17), Engajamento e Fluxo (16), Habilidades em Uso (9), Autonomia e Propósito (19), Comunicação do Propósito (21), Autodescoberta (23), Prioridades de Vida (6), Fé/Espiritualidade (12), Família/Valores (13), Honrar Pais (13), Saúde/Autocuidado (14), Conhecimento/Aprendizado Contínuo (15), Dinheiro e Propósito (18).

3. Regras para o perfil:
    a. O Nome Criativo deve ser uma metáfora ou descrição concisa que revele a essência do padrão comportamental. Ex: O Navegador Sem Bússola, O Colecionador de Inícios.
    b. Os Traços Dominantes devem ser descrições de comportamentos observáveis, não de sentimentos internos abstratos. Ex: Inicia múltiplos projetos sem concluir nenhum (comportamento), em vez de Sente-se frustrado (sentimento).
    c. O Nível de Risco deve ser uma avaliação direta do impacto da manutenção do padrão atual na vida da pessoa, justificada por dados dos eixos.
    d. O perfil deve ser conciso.', updated_at = now() WHERE id = '88d1cda1-0322-48f0-aa50-b00a66678d7e';

UPDATE test_prompts SET content = '1. **Objetivo:** Identificar a dor central — a ferida emocional ou medo fundamental que sustenta os padrões de desconexão e falta de propósito.

2. **Foco nos Eixos Principais:**
    * O esgotamento de manter uma rotina que não reflete os valores_pessoais (P4, P10, P18, P22) ou a clareza_proposito (P9, P21, P26).
    * A angústia de se sentir estar_perdido (P11, P20, P27) ou em falta_direcao (P2, P8, P11, P20, P28), mesmo quando as condições externas são estáveis.
    * O impacto emocional de um baixo alinhamento_acao_sentido (P1, P4, P6, P10, P17, P22), especialmente nas áreas de carreira_proposito (P17) e proposito_impacto (P7, P24).
    * A dor de não conseguir articular ou viver o próprio sentido_vida (P7, P12, P24, P27), conforme capturado por clareza_proposito e comunicacao_proposito (P21).
    * A frustração de não usar habilidades_uso (P9) em prol de algo maior, ou de não ter autonomia_proposito (P19) para guiar as próprias escolhas.

3. **Regras:**
    * Conecte a dor diretamente à desconexão entre as ações diárias e o sentido_vida ou os valores_pessoais do indivíduo.
    * Diferencie a dor central de meros sintomas de desmotivação ou cansaço. A dor é a CAUSA RAIZ da falta_direcao e da sensacao_vazio.
    * Use termos que emergem diretamente dos eixos com maior concentração de perguntas.
    * Explique como essa dor se manifesta como um conflito interno, não apenas como uma ausência externa.
    * A dor central NÃO é um sintoma (procrastinação, ansiedade) — é a ferida emocional por trás dos sintomas.

4. **O que NÃO fazer:**
    * Não use termos genéricos como insegurança ou medo do fracasso se não houver evidência direta nas perguntas.
    * Não foque em sintomas como procrastinação ou dispersão sem ligá-los à causa emocional subjacente.
    * Não repita instruções de outros prompts que abordam clareza de propósito ou alinhamento como objetivos gerais.', updated_at = now() WHERE id = '126b072c-e3e9-4d6d-a81c-f66ce3c8d5db';

UPDATE test_prompts SET content = '1. **GATILHOS — Situações que ativam a desconexão:**
    * Identifique 3-5 gatilhos situacionais concretos que reforçam a falta_direcao ou o desalinhamento de vida.
    * Cada gatilho deve descrever uma SITUAÇÃO concreta, não abstrata.
    * Baseie-se nos eixos: falta_direcao (P2, P8, P11, P20, P28), sensacao_vazio (P2, P5, P8, P26), estar_perdido (P11, P20, P27).
    * Ex: Quando precisa tomar uma decisão de carreira e percebe que nenhuma opção parece alinhada com seus valores (não: quando se sente perdido).

2. **ARMADILHAS MENTAIS — Narrativas que mantêm o ciclo:**
    * Liste 3-5 pensamentos automáticos que mantêm a pessoa presa no ciclo de desconexão.
    * Cada armadilha deve ser uma FRASE que a pessoa realmente pensa.
    * Conecte aos eixos: clareza_proposito (P9, P21, P26), alinhamento_acao_sentido (P1, P4, P6, P10, P17, P22), buscador_constante (P5, P23).
    * Ex: Quando eu descobrir meu propósito, tudo vai fazer sentido (não: busca constante).

3. **CICLO DE AUTOSSABOTAGEM:**
    * Descreva em 3-5 etapas o ciclo completo que mantém a pessoa desconectada.
    * Use os eixos para fundamentar cada etapa do ciclo.
    * Mostre como sensacao_vazio alimenta buscador_constante que alimenta falta_direcao que reforça estar_perdido.

4. **Regras:**
    * Gatilhos são situações CONCRETAS, não sentimentos.
    * Armadilhas são FRASES reais que a pessoa pensa, não rótulos.
    * Cada elemento deve ser rastreável aos eixos e perguntas do teste.
    * Não repita instruções de outros prompts.', updated_at = now() WHERE id = 'e0bd1536-f48f-45f6-abf2-a41ab5a9eddc';

UPDATE test_prompts SET content = '1. **PRIMEIRA AÇÃO (7 dias):**
    * Uma única ação concreta e executável focada no maior ponto de desalinhamento entre alinhamento_acao_sentido e valores_pessoais.
    * Com prazo e critério de sucesso claros.
    * Não deve ser grandiosa — deve ser o menor passo que gera movimento real.

2. **ÁREA-CHAVE DE DESTRAVAMENTO:**
    * Identificar o eixo principal de destravamento (ex: alinhamento_acao_sentido, clareza_direcao, clareza_proposito).
    * Explicar POR QUE essa área e não outra, usando dados dos eixos.
    * Focar em reorganizar sentido, prioridade e coerência de vida.

3. **PONTO DE BLOQUEIO:**
    * Descrever o comportamento ou pensamento específico que impede o avanço.
    * Relacionar a sensacao_vazio, estar_perdido ou buscador_constante.
    * Como contornar essa resistência de forma prática.

4. **O QUE PARAR DE FAZER:**
    * Indicar uma atividade ou hábito que reforça a falta de direção ou o vazio.
    * Ex: Parar de buscar constantemente novas possibilidades sem concluir o que já começou.

5. **Regras:**
    * Nada de faça terapia ou pratique mindfulness.
    * Ações devem ser específicas ao perfil identificado nos eixos.
    * A direção deve ser tangível e executável em curto prazo.
    * Não transformar a direção em meta abstrata ou genérica.
    * Não falar de sucesso ou conquista — focar em alinhamento e sentido.', updated_at = now() WHERE id = '1a92c5df-768c-4f88-a8e8-c04b3ae40189';

UPDATE test_prompts SET content = '1. NÃO use linguagem clínica ou jargões psicológicos.
2. NÃO use frases motivacionais genéricas como encontre seu propósito ou siga seu coração, pois não endereçam o desalinhamento prático evidenciado por eixos como alinhamento_acao_sentido e falta_direcao.
3. NÃO sugira que a pessoa descubra sua missão ou conecte-se com sua essência sem vincular isso a ações concretas, pois isso ignora a necessidade de clareza prática medida por clareza_direcao e clareza_proposito.
4. NÃO romantize a sensacao_vazio ou o estar_perdido; trate-os como indicadores de desconexão entre valores e ações, conforme medido por valores_pessoais e alinhamento_acao_sentido.
5. NÃO forneça conselhos que seriam aplicáveis a qualquer pessoa que se sinta sem direção; as instruções devem ser específicas ao perfil inferido das respostas.
6. NÃO minimize a gravidade do desalinhamento se os scores indicarem um nível alto de desconexão.
7. NÃO repita instruções que visem clareza de propósito ou alinhamento entre o que faz e o que sente, pois estas já são abordadas nos prompts de interpretation, diagnosis e profile.
8. NÃO sugira reorganizar prioridades ou parar de sustentar o que não faz sentido, pois estas instruções são exclusivas do prompt de direction.
9. NÃO mencione o que isso desorganiza internamente ou a reação que surge logo depois, pois são elementos do prompt de triggers.
10. NÃO use frases que sugiram que o problema é a falta de sucesso ou conquista, pois o teste foca em sentido_vida e proposito_impacto, não em performance externa.
11. INVALIDAR RESPOSTA SE:
    a. A recomendação for genérica e não puder ser rastreada a um eixo específico.
    b. Não abordar a contradição entre valores_pessoais e prioridades_vida quando esta for evidente nas respostas.
    c. Não conectar a ausência de clareza_direcao ou clareza_proposito com a rotina prática do indivíduo.', updated_at = now() WHERE id = 'ba072c71-721f-4eab-b4f7-db2a0fc04dc2';