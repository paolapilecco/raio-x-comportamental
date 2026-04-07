import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ScoreEntry {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  percentage: number;
}

interface PromptRecord {
  prompt_type: string;
  content: string;
  title: string;
}

interface ReportTemplate {
  sections: TemplateSection[];
  output_rules: OutputRules;
}

interface TemplateSection {
  key: string;
  name: string;
  maxSize: number;
  required: boolean;
}

interface OutputRules {
  tone?: string;
  simplicityLevel?: number;
  maxSentencesPerBlock?: number;
  maxTotalBlocks?: number;
  repetitionProhibited?: boolean;
  requiredBlocks?: string[];
  forbiddenLanguage?: string[];
}

// ── Category-specific prompt contexts ──

interface CategoryContext {
  role: string;
  emphasis: string;
  sectionOverrides: Record<string, string>;
  extraInstructions: string;
}

function getCategoryContext(slug: string): CategoryContext {
  // Mapa de Vida has its own PDF/report, skip here
  if (slug === 'mapa-de-vida') {
    return {
      role: 'Você analisa a satisfação do usuário em cada área da vida e identifica onde ele precisa agir primeiro.',
      emphasis: 'Foco em EQUILÍBRIO entre as áreas e PRIORIZAÇÃO de ação.',
      sectionOverrides: {
        resumoPrincipal: 'Qual área da vida está mais desequilibrada e o que isso causa nas outras.',
        significadoPratico: 'Como esse desequilíbrio aparece na rotina real — exemplos concretos.',
        padraoIdentificado: 'Qual padrão de negligência ou compensação entre áreas.',
        direcaoAjuste: 'Qual área priorizar primeiro e por quê — uma ação concreta.',
        proximoPasso: 'Uma ação para esta semana na área mais crítica.',
      },
      extraInstructions: `- Mencione as ÁREAS DA VIDA específicas (saúde, finanças, relacionamento, etc.)
- Compare áreas fortes vs fracas — o que uma compensa na outra?
- O plano de ação deve ser POR ÁREA, não genérico`,
    };
  }

  if (slug === 'padrao-comportamental') {
    return {
      role: 'Você identifica os padrões invisíveis de comportamento que travam a pessoa sem ela perceber.',
      emphasis: 'Foco em PADRÕES REPETITIVOS e MECANISMOS AUTOMÁTICOS.',
      sectionOverrides: {
        resumoPrincipal: 'Qual padrão domina e como ele funciona por baixo das decisões conscientes.',
        significadoPratico: 'Em quais decisões do dia a dia esse padrão aparece — exemplos reais.',
        comoAparece: 'Situações concretas onde o padrão se ativa sem a pessoa perceber.',
        direcaoAjuste: 'Qual comportamento automático interromper primeiro.',
      },
      extraInstructions: `- Foque em MECANISMOS AUTOMÁTICOS — coisas que a pessoa faz no piloto automático
- Identifique o CICLO: gatilho → reação automática → consequência → reforço
- O ponto cego deve revelar algo que a pessoa genuinamente não vê`,
    };
  }

  // Execução & Produtividade
  if (slug.includes('execucao') || slug.includes('produtividade')) {
    return {
      role: 'Você analisa por que a pessoa não consegue executar com consistência, mesmo sabendo o que precisa fazer.',
      emphasis: 'Foco em EXECUÇÃO, CONSISTÊNCIA e PROCRASTINAÇÃO.',
      sectionOverrides: {
        resumoPrincipal: 'Onde exatamente a execução trava — o que acontece entre planejar e fazer.',
        significadoPratico: 'Como essa falha de execução aparece no trabalho, projetos e metas.',
        padraoIdentificado: 'O tipo de procrastinação ou bloqueio — nomeie o mecanismo específico.',
        comoAparece: 'Exemplos: prazos perdidos, projetos abandonados, ciclos de motivação que somem.',
        direcaoAjuste: 'A menor ação possível para quebrar o ciclo de inação.',
      },
      extraInstructions: `- NÃO diga "tenha mais disciplina" — explique o que CAUSA a falta de execução
- Identifique se o problema é INÍCIO (não começa), SUSTENTAÇÃO (não mantém) ou FINALIZAÇÃO (não termina)
- Gatilhos devem ser sobre SITUAÇÕES DE TRABALHO/ROTINA reais`,
    };
  }

  // Emoções & Reatividade
  if (slug.includes('emocional') || slug.includes('emocoes') || slug.includes('reatividade')) {
    return {
      role: 'Você analisa como as emoções controlam as decisões da pessoa e onde ela perde o controle.',
      emphasis: 'Foco em REAÇÕES EMOCIONAIS e REGULAÇÃO.',
      sectionOverrides: {
        resumoPrincipal: 'Qual emoção domina e como ela sequestra as decisões.',
        significadoPratico: 'Em quais situações a pessoa reage de forma desproporcional — exemplos.',
        padraoIdentificado: 'O tipo de reatividade — explosiva, supressiva, evitativa.',
        comoAparece: 'Exemplos de reações que a pessoa se arrepende depois.',
        direcaoAjuste: 'Uma técnica simples para o momento entre o gatilho e a reação.',
      },
      extraInstructions: `- Identifique a EMOÇÃO DOMINANTE (raiva, ansiedade, medo, tristeza)
- Diferencie entre SENTIR a emoção (normal) e SER CONTROLADO por ela (problema)
- Gatilhos devem ser emocionais: situações que disparam reações intensas`,
    };
  }

  // Relacionamentos & Apego
  if (slug.includes('relacionamento') || slug.includes('apego')) {
    return {
      role: 'Você analisa como a pessoa se conecta (ou se desconecta) dos outros e quais padrões repetitivos aparecem.',
      emphasis: 'Foco em PADRÕES RELACIONAIS e VÍNCULOS.',
      sectionOverrides: {
        resumoPrincipal: 'Qual padrão de conexão domina — como a pessoa se comporta nos vínculos.',
        significadoPratico: 'Como isso afeta namoro, amizades, família e trabalho em equipe.',
        padraoIdentificado: 'O estilo de apego ou padrão relacional — evitativo, ansioso, controlador.',
        comoAparece: 'Exemplos de conflitos repetitivos ou dificuldades recorrentes.',
        direcaoAjuste: 'Uma mudança concreta no próximo momento de tensão relacional.',
      },
      extraInstructions: `- Foque em PADRÕES QUE SE REPETEM em diferentes relações
- Identifique o PAPEL que a pessoa assume (salvador, vítima, controlador, evitador)
- O que a pessoa FAZ que afasta os outros ou cria dependência`,
    };
  }

  // Autoimagem & Identidade
  if (slug.includes('autoimagem') || slug.includes('identidade')) {
    return {
      role: 'Você analisa como a pessoa se vê e onde essa visão está distorcida ou limitante.',
      emphasis: 'Foco em AUTOCONCEPÇÃO e CRENÇAS LIMITANTES.',
      sectionOverrides: {
        resumoPrincipal: 'Como a pessoa se enxerga vs como ela realmente funciona.',
        significadoPratico: 'Onde essa autoimagem distorcida limita decisões e oportunidades.',
        padraoIdentificado: 'O tipo de distorção — se subestima, se idealiza, depende de validação.',
        comoAparece: 'Exemplos: evita desafios, se compara demais, não se candidata, aceita menos.',
        direcaoAjuste: 'Uma ação para testar uma crença limitante na prática.',
      },
      extraInstructions: `- Identifique a NARRATIVA INTERNA que a pessoa conta sobre si mesma
- Contraste: como ela se vê vs o que os dados mostram
- As armadilhas mentais devem ser FRASES que a pessoa repete para si mesma`,
    };
  }

  // Dinheiro & Decisão
  if (slug.includes('dinheiro') || slug.includes('financ')) {
    return {
      role: 'Você analisa a relação emocional da pessoa com dinheiro e como isso afeta suas decisões financeiras.',
      emphasis: 'Foco em COMPORTAMENTO FINANCEIRO e DECISÕES COM DINHEIRO.',
      sectionOverrides: {
        resumoPrincipal: 'Qual é a relação real da pessoa com dinheiro — medo, impulso, evitação.',
        significadoPratico: 'Como isso aparece: gastos impulsivos, medo de investir, autossabotagem financeira.',
        padraoIdentificado: 'O perfil financeiro comportamental — gastador emocional, acumulador ansioso, evitador.',
        comoAparece: 'Exemplos: compras por impulso, nunca guarda dinheiro, medo de cobrar.',
        direcaoAjuste: 'Uma mudança concreta na próxima decisão financeira.',
      },
      extraInstructions: `- Identifique se o problema é EMOCIONAL (gasta pra compensar) ou COGNITIVO (não sabe planejar)
- Conecte o padrão financeiro com o padrão emocional da pessoa
- Gatilhos devem ser situações financeiras reais: receber salário, ver promoção, pagar contas`,
    };
  }

  // Padrões Ocultos
  if (slug.includes('oculto') || slug.includes('hidden')) {
    return {
      role: 'Você identifica os padrões que a pessoa NÃO sabe que tem — os mecanismos invisíveis de autossabotagem.',
      emphasis: 'Foco em MECANISMOS INCONSCIENTES e AUTOENGANO.',
      sectionOverrides: {
        resumoPrincipal: 'O padrão que a pessoa jura que não tem — mas que aparece nos dados.',
        significadoPratico: 'As consequências que a pessoa atribui a "azar" ou "circunstâncias".',
        padraoIdentificado: 'O mecanismo oculto — o que a pessoa faz sem perceber que faz.',
        comoAparece: 'Exemplos onde a pessoa sabota o próprio progresso achando que está fazendo certo.',
        direcaoAjuste: 'Uma forma de "pegar" o padrão em ação no dia a dia.',
      },
      extraInstructions: `- Este relatório deve REVELAR algo que a pessoa não quer ouvir
- O ponto cego é o CENTRO deste relatório — deve ser desenvolvido com profundidade
- As armadilhas mentais são as JUSTIFICATIVAS que a pessoa usa para manter o padrão`,
    };
  }

  // Propósito & Sentido de Vida
  if (slug.includes('proposito') || slug.includes('sentido')) {
    return {
      role: 'Você analisa o nível de conexão da pessoa com um senso de direção e significado na vida.',
      emphasis: 'Foco em DIREÇÃO DE VIDA, SIGNIFICADO e ALINHAMENTO.',
      sectionOverrides: {
        resumoPrincipal: 'Qual é o nível real de conexão com propósito — conectado, perdido ou desalinhado.',
        significadoPratico: 'Como a falta de direção aparece: insatisfação, rotina vazia, sensação de "para quê?".',
        padraoIdentificado: 'O tipo de desconexão — vive no piloto automático, segue expectativas dos outros, medo de escolher.',
        comoAparece: 'Exemplos: troca de projetos frequente, insatisfação crônica, comparação com outros.',
        direcaoAjuste: 'Uma reflexão prática para identificar o que realmente importa vs o que é pressão externa.',
      },
      extraInstructions: `- NÃO use linguagem mística ou espiritual — foque em ESCOLHAS e ALINHAMENTO prático
- Diferencie entre NÃO TER propósito e NÃO SEGUIR o propósito que já sabe
- O próximo passo deve ser uma ação de AUTOCONHECIMENTO prático, não meditação genérica`,
    };
  }

  // Default fallback
  return {
    role: 'Você é um analista comportamental que interpreta dados de leituras para gerar diagnósticos claros e úteis.',
    emphasis: 'Foco em padrões concretos e direções práticas.',
    sectionOverrides: {},
    extraInstructions: '',
  };
}

// ── Structured prompt builder ──

function buildStructuredSystemPrompt(prompts: PromptRecord[], categoryCtx: CategoryContext, template?: ReportTemplate | null): string {
  const promptMap: Record<string, string> = {};
  prompts.forEach((p) => { promptMap[p.prompt_type] = p.content; });

  const sections: string[] = [];

  // Role definition — category-specific
  sections.push(`# PAPEL
${categoryCtx.role}
Você recebe dados reais de uma leitura comportamental e deve gerar um diagnóstico estruturado usando APENAS os dados fornecidos.
ÊNFASE DESTE TESTE: ${categoryCtx.emphasis}`);

  // Admin-configured prompt sections
  if (promptMap.interpretation) {
    sections.push(`# INSTRUÇÕES DE INTERPRETAÇÃO (definidas pelo administrador)
${promptMap.interpretation}`);
  }

  if (promptMap.diagnosis) {
    sections.push(`# DIAGNÓSTICO FINAL
${promptMap.diagnosis}`);
  }

  if (promptMap.profile) {
    sections.push(`# IDENTIFICAÇÃO DE PERFIL
${promptMap.profile}`);
  }

  if (promptMap.core_pain) {
    sections.push(`# DOR CENTRAL
${promptMap.core_pain}`);
  }

  if (promptMap.triggers) {
    sections.push(`# GATILHOS E ARMADILHAS
${promptMap.triggers}`);
  }

  if (promptMap.direction) {
    sections.push(`# DIREÇÃO PRÁTICA
${promptMap.direction}`);
  }

  if (promptMap.restrictions) {
    sections.push(`# RESTRIÇÕES OBRIGATÓRIAS
${promptMap.restrictions}`);
  }

  // Hard rules — always enforced regardless of admin prompts
  sections.push(`# REGRAS INVIOLÁVEIS

1. LINGUAGEM SIMPLES — COMO CONVERSA
   - Escreva como se estivesse explicando para um amigo inteligente que NÃO é psicólogo
   - Use palavras do dia a dia. Proibido: "resiliência", "protagonismo", "autoboicote", "ressignificar", "empoderamento", "assertividade", "proatividade", "autoconhecimento", "autossabotagem consciente", "padrão disfuncional", "dinâmica relacional", "mecanismo compensatório"
   - Em vez de termos técnicos, DESCREVA o que acontece: "você trava quando precisa decidir" em vez de "paralisia decisória"
   - Frases curtas — máximo 1,5 linhas. Se precisa de vírgula, quebre em duas.
   - Proibido parágrafos com mais de 2 frases seguidas

2. ZERO PSICOLOGUÊS
   - Proibido termos de terapeuta ou coach: "zona de conforto", "crenças limitantes", "inner child", "self", "mindset"
   - Proibido linguagem de autoajuda: "acredite no seu potencial", "honre sua jornada", "você é capaz"
   - Proibido linguagem motivacional: "você pode mais", "é hora de brilhar", "transforme sua vida"
   - Teste: se uma pessoa de 16 anos não entenderia, reescreva

3. INTERPRETAR, NÃO INVENTAR
   - Use SOMENTE os dados fornecidos (scores, eixos, respostas)
   - Cada afirmação deve ser rastreável a um score ou resposta real
   - Não invente situações, exemplos pessoais ou histórias

4. ESPECIFICIDADE OBRIGATÓRIA
   - Proibido frases genéricas: "tenha mais foco", "acredite em si", "busque equilíbrio"
   - Cada frase deve conter o padrão ESPECÍFICO deste usuário
   - Se a frase serve para qualquer pessoa, delete e reescreva

5. COERÊNCIA COM O TESTE
   - O relatório DEVE refletir o tipo de teste feito. Teste emocional fala de emoções. Teste financeiro fala de dinheiro.
   - NÃO misture linguagem de um tipo de teste com outro
   - O vocabulário, os exemplos e as ações devem ser do UNIVERSO do teste aplicado
   - O tom muda conforme o teste: financeiro é prático, emocional é acolhedor, execução é objetivo

6. FORMATO E BREVIDADE
   - Fale em segunda pessoa ("você")
   - Não mencione nomes de variáveis ou percentuais numéricos
   - Seja direto — desconforto é aceitável, generalidade não
   - Responda EXCLUSIVAMENTE em JSON válido
   - MÁXIMO 2 frases por bloco (chamaAtencao, padraoRepetido, comoAparece, corrigirPrimeiro, acaoInicial)
   - Listas (gatilhos, pararDeFazer): máximo 4 itens, 1 frase cada
   - exitStrategy: máximo 4 passos curtos
   - mentalTraps: máximo 4 frases curtas entre aspas

7. ZERO REPETIÇÃO
   - Cada seção DEVE trazer informação NOVA
   - Se duas seções dizem a mesma coisa com palavras diferentes, reescreva uma delas
   - chamaAtencao ≠ padraoRepetido ≠ comoAtrapalha — são ângulos DIFERENTES do mesmo problema
   - corrigirPrimeiro (DIREÇÃO: o que mudar) ≠ acaoInicial (AÇÃO: o que fazer hoje)
   - Se ao reler você encontrar repetição, corte e substitua

8. ADAPTAÇÃO POR CATEGORIA
   - Cada categoria de teste tem seu próprio estilo, vocabulário e foco
   - Teste de execução: linguagem objetiva, exemplos de trabalho e projetos
   - Teste emocional: linguagem acolhedora mas direta, exemplos de reações e sentimentos
   - Teste relacional: linguagem sobre vínculos, exemplos de conflitos e conexões
   - Teste financeiro: linguagem prática, exemplos de gastos e decisões com dinheiro
   - Teste de propósito: linguagem reflexiva mas concreta, exemplos de direção e escolhas
   - NUNCA use o mesmo estilo para testes diferentes

9. EXEMPLOS DE TOM CORRETO
   - ❌ "Você apresenta um padrão de evitação emocional que compromete sua capacidade de engajamento relacional"
   - ✅ "Você foge de conversas difíceis. Quando algo incomoda, muda de assunto ou some."
   - ❌ "Há uma dinâmica de autossabotagem que se manifesta na procrastinação funcional"
   - ✅ "Você sabe o que precisa fazer, mas adia. Quando finalmente faz, já está atrasado."
    - ❌ "Busque desenvolver sua inteligência emocional para melhorar seus relacionamentos"
    - ✅ "Na próxima discussão, espere 5 segundos antes de responder. Só isso."

10. COMPLETUDE OBRIGATÓRIA — ZERO RESPOSTA APENAS EXPLICATIVA
    - Se um bloco só EXPLICA sem dar DIREÇÃO PRÁTICA, está incompleto
    - TODA saída deve conter os 3 elementos: DIAGNÓSTICO (o que acontece) + EXPLICAÇÃO SIMPLES (por que acontece) + AÇÃO EXECUTÁVEL (o que fazer)
    - chamaAtencao = diagnóstico. padraoRepetido/comoAparece = explicação. corrigirPrimeiro/acaoInicial = ação
    - Se corrigirPrimeiro ou acaoInicial estiverem vagos ou ausentes, o relatório FALHOU
    - Teste: releia cada bloco e pergunte "a pessoa sabe O QUE FAZER depois de ler isso?" — se não, reescreva`);

  sections.push(`# OBJETIVO DA ANÁLISE

Identificar o PADRÃO COMPORTAMENTAL DOMINANTE do usuário com base nas respostas.

REGRAS DE DETECÇÃO:
- NÃO analise respostas isoladas — busque o que se REPETE ao longo de várias respostas
- Detecte REPETIÇÃO de comportamento: se 3+ respostas apontam para o mesmo mecanismo, esse é o padrão
- Priorize estes padrões específicos quando detectados:
  • EVITAÇÃO: foge de situações desconfortáveis, adia decisões, evita conflitos
  • FUGA PARA TAREFAS FÁCEIS: troca o que importa por tarefas pequenas que dão sensação de produtividade
  • MEDO DE JULGAMENTO: deixa de agir por medo do que os outros vão pensar
  • PERFECCIONISMO PARALISANTE: não começa ou não termina porque nunca está bom o suficiente
  • ABANDONO APÓS PERDA DE EMPOLGAÇÃO: começa com energia, mas abandona quando a motivação inicial some
- Se nenhum desses se encaixa, nomeie o padrão real encontrado nas respostas

SAÍDA OBRIGATÓRIA: Nome do padrão + explicação direta baseada no comportamento observado nas respostas.`);

  sections.push(`# INTERPRETAÇÃO NEUROCIENTÍFICA DO COMPORTAMENTO

Todo padrão identificado é resultado de um CIRCUITO NEURAL AUTOMATIZADO — não é falta de disciplina, preguiça ou fraqueza.

REGRAS DE INTERPRETAÇÃO:
- O comportamento é REPETIÇÃO DE PADRÃO APRENDIDO — o cérebro gravou esse caminho e repete no automático
- O cérebro SEMPRE busca 3 coisas:
  1. EVITAR DESCONFORTO IMEDIATO — foge da dor antes que ela chegue
  2. BUSCAR ALÍVIO RÁPIDO — troca o difícil pelo fácil para sentir algo bom agora
  3. REPETIR O QUE JÁ CONHECE — mesmo que dê errado, o familiar é "seguro" para o cérebro

OBRIGATÓRIO NA EXPLICAÇÃO:
- Diga POR QUE o cérebro faz isso — qual ameaça ele está evitando
- Diga qual RECOMPENSA está sendo buscada (alívio, validação, controle, conforto)
- Use linguagem simples: "Seu cérebro aprendeu que..." / "Isso acontece porque sua mente associou..."
- NUNCA diga "você escolhe fazer isso" — o padrão é AUTOMÁTICO até ser percebido
- NUNCA trate como falha moral — é um mecanismo de proteção que já não serve mais`);

  sections.push(`# INTERVENÇÃO COMPORTAMENTAL

A ação prática (acaoInicial, corrigirPrimeiro, exitStrategy) deve ser uma INTERVENÇÃO que QUEBRA o circuito neural automático.

REGRAS DA INTERVENÇÃO:
1. DEVE QUEBRAR O CICLO AUTOMÁTICO — forçar o cérebro a fazer algo DIFERENTE do padrão habitual
2. DEVE GERAR DESCONFORTO CONTROLADO — não confortável, mas suportável. O desconforto é o sinal de que o cérebro está criando novo caminho
3. DEVE SER EXECUTÁVEL IMEDIATAMENTE — sem preparação, sem "quando estiver pronto"

FORMATO OBRIGATÓRIO:
- AÇÃO SIMPLES: uma frase, um comportamento (ex: "Diga não para o próximo pedido que receber")
- TEMPO DEFINIDO: quando e por quanto tempo (ex: "Amanhã, por 10 minutos")
- COMPORTAMENTO CLARO: o que fazer, não o que pensar (ex: "Feche o celular e sente na cadeira" — não "reflita sobre suas prioridades")

OBJETIVO: forçar uma NOVA RESPOSTA NEURAL. O cérebro só muda quando é obrigado a responder diferente.

EXEMPLOS:
- Padrão de evitação → "Hoje, faça a primeira coisa da sua lista ANTES de abrir o celular. 15 minutos."
- Medo de julgamento → "Publique algo sem revisar mais de uma vez. Hoje."  
- Perfeccionismo → "Entregue uma tarefa 70% pronta. Propositalmente imperfeita. Amanhã."
- Fuga para tarefas fáceis → "Bloqueie 30 minutos para a tarefa que mais te incomoda. Timer ligado. Agora."
- Abandono após empolgação → "Continue o projeto que abandonou por último. 20 minutos. Sem trocar para outro."

PROIBIDO:
- "Reflita sobre seus padrões" (não é ação)
- "Busque autoconhecimento" (genérico)  
- "Tente ser mais disciplinado" (moralismo)
- "Observe seus gatilhos" (passivo)
- Qualquer ação que não gere desconforto controlado

## COMANDO MENTAL DE REPROGRAMAÇÃO (mentalCommand)

Além da ação prática, gere UMA FRASE de reprogramação mental que o usuário deve repetir ANTES de executar a ação.

OBJETIVO:
- Enfraquecer o padrão neural antigo
- Reforçar o novo comportamento
- Preparar o cérebro para agir diferente

REGRAS:
- Frase em PRIMEIRA PESSOA ("Eu...")
- CURTA: máximo 10 palavras
- DIRETA: sem floreio, sem motivação genérica
- Deve CONTRADIZER a crença que mantém o padrão
- Deve ser ESPECÍFICA ao padrão identificado

EXEMPLOS POR PADRÃO:
- Evitação → "Eu não preciso estar pronto pra começar."
- Perfeccionismo → "Feito imperfeito vale mais que perfeito adiado."
- Medo de julgamento → "A opinião dos outros não paga minhas contas."
- Fuga para tarefas fáceis → "O fácil me engana. O difícil me move."
- Abandono → "Eu termino o que começo, mesmo sem vontade."

PROIBIDO:
- "Eu sou capaz" (genérico)
- "Eu mereço o melhor" (autoajuda)
- "Eu confio no processo" (vazio)
- Qualquer frase que sirva para qualquer pessoa`);


  sections.push(`# CAMADA DE PROFUNDIDADE

Antes de gerar o diagnóstico:
1. Cruze o padrão dominante com os secundários — como um alimenta o outro?
2. Identifique onde o usuário diz uma coisa e faz outra (use as respostas)
3. A dor central NÃO é o padrão reformulado — é o mecanismo invisível por trás
4. Teste anti-genericidade: se a frase serve para qualquer pessoa, reescreva
5. Coerência: corePain → mechanism → contradiction → direction → firstAction`);

  // Inject admin-configured output rules from report_templates
  if (template?.output_rules) {
    const rules = template.output_rules;
    const ruleLines: string[] = [];
    
    if (rules.tone) {
      ruleLines.push(`- TOM OBRIGATÓRIO: ${rules.tone}`);
    }
    if (rules.simplicityLevel) {
      const levelDesc: Record<number, string> = {
        1: 'Pode usar termos técnicos quando necessário',
        2: 'Poucos termos técnicos, sempre explicados',
        3: 'Linguagem moderada, acessível mas precisa',
        4: 'Linguagem simples do dia a dia, sem jargão',
        5: 'Ultra-simples: qualquer pessoa de 14 anos deve entender',
      };
      ruleLines.push(`- NÍVEL DE SIMPLICIDADE: ${levelDesc[rules.simplicityLevel] || 'Linguagem simples'}`);
    }
    if (rules.maxSentencesPerBlock) {
      ruleLines.push(`- MÁXIMO ${rules.maxSentencesPerBlock} frases por bloco — sem exceção`);
    }
    if (rules.maxTotalBlocks) {
      ruleLines.push(`- MÁXIMO ${rules.maxTotalBlocks} blocos no relatório total`);
    }
    if (rules.repetitionProhibited) {
      ruleLines.push(`- REPETIÇÃO PROIBIDA: cada bloco DEVE trazer informação nova. Se dois blocos dizem a mesma coisa com palavras diferentes, reescreva um deles.`);
    }
    if (rules.forbiddenLanguage && rules.forbiddenLanguage.length > 0) {
      ruleLines.push(`- TERMOS PROIBIDOS (nunca usar): ${rules.forbiddenLanguage.map(t => `"${t}"`).join(', ')}`);
    }
    if (rules.requiredBlocks && rules.requiredBlocks.length > 0) {
      ruleLines.push(`- BLOCOS OBRIGATÓRIOS (devem estar presentes): ${rules.requiredBlocks.join(', ')}`);
    }

    if (ruleLines.length > 0) {
      sections.push(`# REGRAS DE SAÍDA CONFIGURADAS PELO ADMINISTRADOR\n\n${ruleLines.join('\n')}`);
    }
  }

  return sections.join("\n\n---\n\n");
}

interface StructuredAnswer {
  questionId: number;
  questionText: string;
  questionType: string;
  axes: string[];
  value: number;
  mappedScore?: number;
  chosenOption: string | null;
}

function buildAnswersSummary(answers: StructuredAnswer[]): string {
  if (!answers || answers.length === 0) return "Respostas brutas não disponíveis.";

  // Group answers by axis for pattern detection
  const byAxis: Record<string, { question: string; mappedScore: number; option: string | null }[]> = {};
  answers.forEach(a => {
    const score = a.mappedScore ?? a.value;
    a.axes.forEach(axis => {
      if (!byAxis[axis]) byAxis[axis] = [];
      byAxis[axis].push({ question: a.questionText, mappedScore: score, option: a.chosenOption });
    });
  });

  const lines: string[] = [];

  // High-signal answers (extremes based on mappedScore: 0-20 or 80-100)
  const extremes = answers.filter(a => {
    const score = a.mappedScore ?? 0;
    return score <= 20 || score >= 80;
  });
  if (extremes.length > 0) {
    lines.push("### RESPOSTAS EXTREMAS (sinais fortes):");
    extremes.forEach(a => {
      const score = a.mappedScore ?? 0;
      const label = score >= 80 ? "CONCORDÂNCIA FORTE" : "DISCORDÂNCIA FORTE";
      const optionText = a.chosenOption ? ` → "${a.chosenOption}"` : "";
      lines.push(`- [${label} — ${score}%] "${a.questionText}" (eixos: ${a.axes.join(", ")})${optionText}`);
    });
  }

  // Behavior choice answers (direct behavioral evidence)
  const behaviorChoices = answers.filter(a => a.questionType === 'behavior_choice' && a.chosenOption);
  if (behaviorChoices.length > 0) {
    lines.push("\n### ESCOLHAS COMPORTAMENTAIS (comportamento real):");
    behaviorChoices.forEach(a => {
      const score = a.mappedScore ?? a.value;
      lines.push(`- "${a.questionText}" → escolheu: "${a.chosenOption}" (score: ${score}%, eixos: ${a.axes.join(", ")})`);
    });
  }

  // All answers with mapped scores for full context
  lines.push("\n### TODAS AS RESPOSTAS (com score mapeado):");
  answers.forEach(a => {
    const score = a.mappedScore ?? a.value;
    const optionText = a.chosenOption ? ` → "${a.chosenOption}"` : "";
    lines.push(`- [${score}%] "${a.questionText}"${optionText} (eixos: ${a.axes.join(", ")})`);
  });

  // Inconsistency detection: same axis, opposing mapped scores
  lines.push("\n### INCONSISTÊNCIAS DETECTADAS:");
  let hasInconsistency = false;
  Object.entries(byAxis).forEach(([axis, items]) => {
    const scores = items.map(i => i.mappedScore);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    if (max - min >= 60 && items.length >= 2) {
      hasInconsistency = true;
      const high = items.find(i => i.mappedScore === max);
      const low = items.find(i => i.mappedScore === min);
      lines.push(`- Eixo "${axis}": resposta alta (${max}%) em "${high?.question}" vs baixa (${min}%) em "${low?.question}" — possível autoengano ou ambivalência`);
    }
  });
  if (!hasInconsistency) {
    lines.push("- Nenhuma inconsistência extrema detectada nos mesmos eixos.");
  }

  return lines.join("\n");
}

function buildUserPrompt(
  userContext: string,
  slug: string,
  intensity: string,
  scoresSummary: string,
  dominant: ScoreEntry,
  secondary: ScoreEntry[],
  contradictions: string,
  answersSummary: string,
  categoryCtx: CategoryContext,
  template?: ReportTemplate | null
): string {
  const ov = categoryCtx.sectionOverrides;
  return `${userContext}
Teste: ${slug}
Intensidade geral: ${intensity}

## DADOS DOS EIXOS (base obrigatória para toda interpretação):
${scoresSummary}

## PADRÃO DOMINANTE: ${dominant.label} (intensidade: ${dominant.percentage > 75 ? 'alta' : dominant.percentage > 50 ? 'moderada' : 'leve'})
${secondary.length > 0
    ? `## PADRÕES SECUNDÁRIOS: ${secondary.map((s) => `${s.label} (${s.percentage > 75 ? 'alta' : s.percentage > 50 ? 'moderada' : 'leve'})`).join(", ")}`
    : "Sem padrões secundários significativos."}

## CRUZAMENTOS E CONTRADIÇÕES DETECTADOS:
${contradictions}

## EVIDÊNCIAS DAS RESPOSTAS DO USUÁRIO:
${answersSummary}

---

${buildJsonOutputSchema(ov, template, categoryCtx)}`;
}

/**
 * Build the JSON output schema dynamically.
 * If a report_template with sections exists, use those sections.
 * Otherwise, fall back to the default 8-section structure.
 */
function buildJsonOutputSchema(
  ov: Record<string, string>,
  template?: ReportTemplate | null,
  categoryCtx?: CategoryContext
): string {
  const maxSentences = template?.output_rules?.maxSentencesPerBlock || 2;

  // If template has custom sections, build dynamic schema
  if (template?.sections && Array.isArray(template.sections) && template.sections.length > 0) {
    const sectionLines = template.sections.map((sec) => {
      const instruction = ov[sec.key] || `Conteúdo para "${sec.name}" — máximo ${sec.maxSize || maxSentences} frases.`;
      // Determine if it's a list or text field based on key patterns
      const isListField = ['gatilhos', 'pararDeFazer', 'mentalTraps', 'selfSabotageCycle', 'whatNotToDo', 'oQueEvitar'].includes(sec.key);
      if (isListField) {
        return `  "${sec.key}": ["${instruction}"]`;
      }
      if (sec.key === 'impactoPorArea') {
        return `  "impactoPorArea": [
    {"area": "Rotina", "efeito": "1 frase"},
    {"area": "Trabalho", "efeito": "1 frase"},
    {"area": "Emocional", "efeito": "1 frase"},
    {"area": "Relações", "efeito": "1 frase"},
    {"area": "Autoconfiança", "efeito": "1 frase"}
  ]`;
      }
      return `  "${sec.key}": "${instruction}"`;
    });

    return `Gere o diagnóstico em JSON com esta estrutura personalizada para este teste. Máximo ${maxSentences} frases por bloco. Linguagem simples, direta, sem rodeio. Cada seção traz informação NOVA — ZERO repetição:
{
${sectionLines.join(',\n')},

  "profileName": "Nome criativo do perfil (3-5 palavras)",
  "combinedTitle": "Título curto e impactante do diagnóstico",
  "blindSpot": {"perceivedProblem": "O que a pessoa acha que é o problema", "realProblem": "O que realmente acontece"},
  "criticalDiagnosis": "Copie chamaAtencao ou resumoPrincipal",
  "corePain": "Resuma o impacto em 1 frase",
  "mentalState": "Estado mental atual em 1 frase",
  "summary": "Copie chamaAtencao ou resumoPrincipal",
  "mechanism": "Copie padraoRepetido ou padraoIdentificado",
  "contradiction": "A contradição interna principal — 1 frase",
  "impact": "Resuma o impacto em 1 frase",
  "direction": "Copie corrigirPrimeiro ou direcaoAjuste",
  "keyUnlockArea": "Copie corrigirPrimeiro ou direcaoAjuste",
  "blockingPoint": "Onde a pessoa trava — 1 frase",
  "triggers": ["mesmos gatilhos acima"],
  "mentalTraps": ["2-3 pensamentos que mantêm o padrão — entre aspas"],
  "selfSabotageCycle": ["3-4 etapas do ciclo em ordem — frases curtas"],
  "whatNotToDo": ["mesmos itens de pararDeFazer"],
  "lifeImpact": [{"pillar": "área", "impact": "efeito concreto em 1 frase"}],
  "exitStrategy": [{"step": 1, "title": "título curto", "action": "ação executável"}],
  "actionPlan": [{"area": "área com nota < 7", "score": 5, "actions": ["ação concreta"]}],
  "firstAction": "Copie acaoInicial ou proximoPasso",
  "mentalCommand": "Uma frase curta e direta de reprogramação mental que o usuário deve repetir ANTES de executar a ação. Objetivo: enfraquecer o padrão antigo e reforçar o novo comportamento. Formato: frase em primeira pessoa, sem aspas internas. Ex: Eu não preciso estar pronto pra começar."
}

REGRAS FINAIS:
- MÁXIMO ${maxSentences} frases por bloco. Sem exceção.
- NÃO repita a mesma ideia entre seções.
- ZERO palavras rebuscadas.
- actionPlan: só para áreas abaixo de 70%.
- Se não houver áreas abaixo de 70%, retorne actionPlan como [].
- corrigirPrimeiro/direcaoAjuste: deve conter QUAL comportamento mudar e EM QUAL situação. Proibido: "mude sua relação com X", "busque equilíbrio", "tenha mais consciência".
- acaoInicial/proximoPasso: deve conter QUANDO fazer + COMO fazer + por QUANTO TEMPO. Proibido: "reflita sobre", "observe seus padrões", "tente se conhecer melhor".
- pararDeFazer: cada item deve ter SITUAÇÃO + COMPORTAMENTO específico. Proibido: "pare de se cobrar", "pare de procrastinar".
${categoryCtx?.extraInstructions ? `\nINSTRUÇÕES ESPECÍFICAS DESTE TIPO DE TESTE:\n${categoryCtx.extraInstructions}` : ''}`;
  }

  // Default 8-section structure (fallback)
  return `Gere o diagnóstico em JSON com esta estrutura EXATA de 8 seções. Máximo ${maxSentences} frases por bloco. Linguagem simples, direta, sem rodeio. Nada de psicologuês. Cada seção traz informação NOVA — ZERO repetição:
{
  "chamaAtencao": "${ov.resumoPrincipal || 'O que mais salta aos olhos no resultado — 1-2 frases diretas, sem introdução.'}",
  "padraoRepetido": "${ov.padraoIdentificado || 'O padrão que mais se repete — nome curto + 1 frase explicando o mecanismo.'}",
  "comoAparece": "${ov.comoAparece || '1-2 exemplos concretos do dia a dia onde isso aparece.'}",
  "gatilhos": ["2-3 situações reais e específicas que disparam o padrão — 1 frase cada"],
  "impactoPorArea": [
    {"area": "Rotina", "efeito": "1 frase sobre como o padrão afeta a rotina diária"},
    {"area": "Trabalho", "efeito": "1 frase sobre impacto no trabalho/projetos"},
    {"area": "Emocional", "efeito": "1 frase sobre o custo emocional"},
    {"area": "Relações", "efeito": "1 frase sobre efeito nos relacionamentos"},
    {"area": "Autoconfiança", "efeito": "1 frase sobre impacto na autoimagem"}
  ],
  "corrigirPrimeiro": "${ov.direcaoAjuste || 'O comportamento ESPECÍFICO que precisa mudar. Diga QUAL comportamento, em QUAL situação. Exemplo: Em vez de dizer mude sua relação com trabalho, diga Pare de aceitar tarefas extras quando já está sobrecarregado. 1-2 frases.'}",
  "pararDeFazer": ["2-3 coisas para PARAR imediatamente — cada item com SITUAÇÃO + COMPORTAMENTO. Exemplo: Parar de responder mensagens de trabalho depois das 21h"],
  "acaoInicial": "${ov.proximoPasso || 'UMA AÇÃO EXECUTÁVEL com QUANDO + COMO + QUANTO TEMPO. Exemplo: Amanhã de manhã, antes de abrir o celular, escreva 3 coisas que precisa fazer hoje e faça a primeira antes de qualquer outra coisa. DEVE ser diferente de corrigirPrimeiro. NÃO pode ser conselho genérico como reflita sobre ou observe seus padrões.'}",

  "profileName": "Nome criativo do perfil (3-5 palavras)",
  "combinedTitle": "Título curto e impactante do diagnóstico",
  "blindSpot": {"perceivedProblem": "O que a pessoa acha que é o problema", "realProblem": "O que realmente acontece"},
  "criticalDiagnosis": "Copie chamaAtencao",
  "corePain": "Resuma impactoPorArea em 1 frase",
  "mentalState": "Estado mental atual em 1 frase",
  "summary": "Copie chamaAtencao",
  "mechanism": "Copie padraoRepetido",
  "contradiction": "A contradição interna principal — 1 frase",
  "impact": "Resuma impactoPorArea em 1 frase",
  "direction": "Copie corrigirPrimeiro",
  "keyUnlockArea": "Copie corrigirPrimeiro",
  "blockingPoint": "Onde a pessoa trava — 1 frase",
  "triggers": ["mesmos gatilhos acima"],
  "mentalTraps": ["2-3 pensamentos que a pessoa repete e que mantêm o padrão — entre aspas"],
  "selfSabotageCycle": ["3-4 etapas do ciclo em ordem — frases curtas"],
  "whatNotToDo": ["mesmos itens de pararDeFazer"],
  "lifeImpact": [{"pillar": "área", "impact": "efeito concreto em 1 frase"}],
  "exitStrategy": [{"step": 1, "title": "título curto", "action": "ação executável"}],
  "actionPlan": [{"area": "área com nota < 7", "score": 5, "actions": ["ação concreta"]}],
  "firstAction": "Copie acaoInicial",
  "mentalCommand": "Uma frase curta e direta de reprogramação mental que o usuário deve repetir ANTES de executar a ação. Objetivo: enfraquecer o padrão antigo e reforçar o novo comportamento. Formato: frase em primeira pessoa. Ex: Eu não preciso estar pronto pra começar."
}

REGRAS FINAIS:
- MÁXIMO ${maxSentences} frases por bloco. Sem exceção.
- NÃO repita a mesma ideia entre seções.
- corrigirPrimeiro = DIREÇÃO (QUAL comportamento mudar, EM QUAL situação). acaoInicial = AÇÃO (QUANDO + COMO + QUANTO TEMPO). São OBRIGATORIAMENTE diferentes.
- Proibido em corrigirPrimeiro: "mude sua relação com X", "busque equilíbrio", "tenha mais consciência"
- Proibido em acaoInicial: "reflita sobre", "observe seus padrões", "tente se conhecer melhor"
- pararDeFazer: cada item com SITUAÇÃO + COMPORTAMENTO. Proibido: "pare de se cobrar", "pare de procrastinar"
- ZERO palavras rebuscadas.
- actionPlan: só para áreas abaixo de 70%.
- Se não houver áreas abaixo de 70%, retorne actionPlan como [].
${categoryCtx?.extraInstructions ? `\nINSTRUÇÕES ESPECÍFICAS DESTE TIPO DE TESTE:\n${categoryCtx.extraInstructions}` : ''}`;
}

function detectContradictions(scores: ScoreEntry[]): string {
  const scoreMap: Record<string, number> = {};
  scores.forEach((s) => { scoreMap[s.key] = s.percentage; });

  const contradictions: string[] = [];
  const sortedScores = [...scores].sort((a, b) => b.percentage - a.percentage);

  // Dynamic contradiction detection: find any pair of high-scoring axes
  // that could represent opposing behaviors
  const highScores = sortedScores.filter(s => s.percentage >= 50);
  
  for (let i = 0; i < highScores.length; i++) {
    for (let j = i + 1; j < highScores.length; j++) {
      const a = highScores[i];
      const b = highScores[j];
      // Only flag if both are significantly high
      if (a.percentage >= 55 && b.percentage >= 55) {
        contradictions.push(`- Eixos "${a.label}" (${a.percentage}%) e "${b.label}" (${b.percentage}%) ambos altos — investigar se há tensão ou conflito entre esses dois comportamentos`);
      }
    }
  }

  // Also detect when top axis is very different from bottom axis
  if (sortedScores.length >= 3) {
    const top = sortedScores[0];
    const bottom = sortedScores[sortedScores.length - 1];
    if (top.percentage - bottom.percentage >= 40) {
      contradictions.push(`- Grande disparidade: "${top.label}" (${top.percentage}%) é muito mais intenso que "${bottom.label}" (${bottom.percentage}%) — padrão concentrado em poucos eixos`);
    }
  }

  // Known behavioral conflict pairs (kept for backward compat but now optional)
  const knownPairs: [string, string, string][] = [
    ['excessive_self_criticism', 'validation_dependency', 'Alta autocrítica combinada com dependência de validação'],
    ['paralyzing_perfectionism', 'unstable_execution', 'Perfeccionismo alto com execução instável'],
    ['discomfort_escape', 'functional_overload', 'Fuga do desconforto com sobrecarga funcional'],
    ['excessive_self_criticism', 'low_routine_sustenance', 'Autocrítica alta com baixa sustentação de rotina'],
    ['emotional_self_sabotage', 'validation_dependency', 'Autossabotagem emocional com dependência de validação'],
  ];

  for (const [keyA, keyB, desc] of knownPairs) {
    if ((scoreMap[keyA] ?? 0) >= 55 && (scoreMap[keyB] ?? 0) >= 55) {
      // Check if not already covered by dynamic detection
      const alreadyCovered = contradictions.some(c => c.includes(keyA) || c.includes(keyB));
      if (!alreadyCovered) {
        contradictions.push(`- ${desc}`);
      }
    }
  }

  if (contradictions.length === 0) {
    contradictions.push("- Sem contradições extremas detectadas. Analisar nuances entre os eixos com scores intermediários.");
  }

  return contradictions.join("\n");
}

// ── Main handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { test_module_id, scores, slug, refine_level, answers: structuredAnswers } = await req.json() as {
      test_module_id: string;
      scores: ScoreEntry[];
      slug: string;
      refine_level?: number;
      answers?: StructuredAnswer[];
    };

    if (!test_module_id || !scores || !Array.isArray(scores)) {
      return new Response(JSON.stringify({ error: "Dados inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch active prompts for THIS specific test
    const { data: prompts, error: promptsError } = await adminClient
      .from("test_prompts")
      .select("prompt_type, title, content")
      .eq("test_id", test_module_id)
      .eq("is_active", true);

    if (promptsError) {
      console.error("Error fetching prompts:", promptsError);
      return new Response(JSON.stringify({ error: "Erro ao carregar configuração do diagnóstico" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // No prompts → fallback to local analysis
    if (!prompts || prompts.length === 0) {
      return new Response(JSON.stringify({ useFallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch report template for this test (sections + output_rules)
    let reportTemplate: ReportTemplate | null = null;
    try {
      const { data: tmpl } = await adminClient
        .from("report_templates")
        .select("sections, output_rules")
        .eq("test_id", test_module_id)
        .maybeSingle();
      if (tmpl) {
        reportTemplate = {
          sections: Array.isArray(tmpl.sections) ? tmpl.sections as TemplateSection[] : [],
          output_rules: (tmpl.output_rules && typeof tmpl.output_rules === 'object') ? tmpl.output_rules as OutputRules : {},
        };
      }
    } catch { /* use defaults if template fetch fails */ }

    // Fetch user profile for context
    const { data: profile } = await userClient
      .from("profiles")
      .select("name, age")
      .eq("user_id", user.id)
      .maybeSingle();

    // Build analysis data
    const sortedScores = [...scores].sort((a, b) => b.percentage - a.percentage);
    const dominant = sortedScores[0];
    const secondary = sortedScores.filter((s, i) => i > 0 && s.percentage >= 40).slice(0, 3);
    const intensity = dominant.percentage >= 75 ? "alto" : dominant.percentage >= 50 ? "moderado" : "leve";

    const scoresSummary = sortedScores
      .map((s) => `- ${s.label}: intensidade ${s.percentage >= 75 ? 'ALTA' : s.percentage >= 50 ? 'MODERADA' : 'LEVE'} (${s.percentage}%)`)
      .join("\n");

    const contradictions = detectContradictions(sortedScores);

    // Build category-specific context
    const categoryCtx = getCategoryContext(slug);

    // Build structured prompts — now with template integration
    const systemPrompt = buildStructuredSystemPrompt(prompts as PromptRecord[], categoryCtx, reportTemplate);

    const userContext = profile
      ? `Usuário: ${profile.name || "Anônimo"}${profile.age ? `, ${profile.age} anos` : ""}`
      : "Usuário anônimo";

    const answersSummary = buildAnswersSummary(structuredAnswers || []);

    const userPrompt = buildUserPrompt(
      userContext, slug, intensity, scoresSummary, dominant, secondary, contradictions, answersSummary, categoryCtx, reportTemplate
    );

    // Build refine instruction if needed
    const refineLevel = refine_level ?? 0;
    const refineInstruction = refineLevel > 0 ? `

---

# INSTRUÇÃO DE REFINAMENTO (nível ${refineLevel})

A resposta anterior foi considerada GENÉRICA ou VAGA. Aplique estas exigências adicionais:

${refineLevel >= 1 ? `- PROIBIDO usar frases como "tenha mais foco", "acredite em si", "busque equilíbrio", "saia da zona de conforto"
- Cada frase DEVE conter uma referência direta ao padrão específico detectado nos dados
- O diagnóstico crítico deve incluir uma CAUSA raiz e uma CONSEQUÊNCIA observável
- A contradição deve ser entre dois comportamentos CONCRETOS, não entre conceitos abstratos` : ""}
${refineLevel >= 2 ? `- A dor central deve explicar o MECANISMO que sustenta o problema — não apenas nomeá-lo
- O ponto cego deve surpreender — não pode ser óbvio
- A primeira ação deve ser executável em 72h com critério de sucesso mensurável
- As restrições (o que não fazer) devem ser contra-intuitivas, não óbvias` : ""}
${refineLevel >= 3 ? `- Use linguagem que gere IMPACTO EMOCIONAL — o usuário deve se sentir lido com precisão cirúrgica
- Cada seção deve conter pelo menos uma frase que o usuário NÃO esperaria ler
- O resumo deve funcionar como um espelho — o usuário deve reconhecer seus comportamentos reais` : ""}
` : "";

    // Call AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ useFallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch AI config: test-specific first, then global fallback
    let aiModel = "google/gemini-3-flash-preview";
    let aiTemperature: number | undefined;
    let aiMaxTokens: number | undefined;

    try {
      // Check for test-specific config
      const { data: testConfig } = await adminClient
        .from("test_ai_config")
        .select("use_global_defaults, ai_enabled, temperature, max_tokens, tone, depth_level, report_style")
        .eq("test_id", test_module_id)
        .maybeSingle();

      // Fetch global config
      const { data: globalConfig } = await adminClient
        .from("global_ai_config")
        .select("ai_model, temperature, max_tokens, tone, depth_level, report_style")
        .limit(1)
        .maybeSingle();

      if (globalConfig?.ai_model) aiModel = globalConfig.ai_model;

      // Use test-specific params when use_global_defaults is false
      if (testConfig && !testConfig.use_global_defaults) {
        aiTemperature = testConfig.temperature;
        aiMaxTokens = testConfig.max_tokens;
      } else if (globalConfig) {
        aiTemperature = globalConfig.temperature;
        aiMaxTokens = globalConfig.max_tokens;
      }
    } catch { /* use defaults */ }

    // Clamp temperature to 0.5-0.6 range for diagnostic precision
    const clampedTemp = aiTemperature !== undefined 
      ? Math.min(0.6, Math.max(0.5, aiTemperature)) 
      : 0.55;

    const aiBody: Record<string, unknown> = {
      model: aiModel,
      messages: [
        { role: "system", content: systemPrompt + (refineLevel > 0 ? refineInstruction : "") },
        { role: "user", content: userPrompt },
      ],
      temperature: clampedTemp,
    };
    if (aiMaxTokens !== undefined) aiBody.max_tokens = aiMaxTokens;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(aiBody),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI error:", aiResponse.status, await aiResponse.text());
      return new Response(JSON.stringify({ useFallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON
    let result;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      result = JSON.parse(jsonMatch[1]!.trim());
    } catch {
      console.error("Failed to parse AI response:", content.substring(0, 500));
      return new Response(JSON.stringify({ useFallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate: accept either new template or legacy fields
    const hasNewTemplate = result.resumoPrincipal && result.significadoPratico;
    const hasLegacy = result.criticalDiagnosis && result.corePain;
    
    if (!hasNewTemplate && !hasLegacy) {
      console.error("AI response missing required fields");
      return new Response(JSON.stringify({ useFallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cross-fill between new and legacy fields
    if (!result.criticalDiagnosis) result.criticalDiagnosis = result.resumoPrincipal || "";
    if (!result.corePain) result.corePain = result.significadoPratico || "";
    if (!result.mechanism) result.mechanism = result.padraoIdentificado || "";
    if (!result.mentalState) result.mentalState = result.comoAparece || "";
    if (!result.direction) result.direction = result.direcaoAjuste || "";
    if (!result.keyUnlockArea) result.keyUnlockArea = result.direcaoAjuste || "";
    if (!result.summary) result.summary = result.resumoPrincipal || "";
    if (!result.profileName) result.profileName = "";
    if (!result.contradiction) result.contradiction = "";

    // Ensure arrays and objects
    ["triggers", "mentalTraps", "selfSabotageCycle", "whatNotToDo", "gatilhos", "oQueEvitar"].forEach((f) => {
      if (!Array.isArray(result[f])) result[f] = [];
    });
    if (!Array.isArray(result.lifeImpact)) result.lifeImpact = [];
    if (!Array.isArray(result.impactoVida)) result.impactoVida = [];
    if (!Array.isArray(result.exitStrategy)) result.exitStrategy = [];
    if (!result.blindSpot || typeof result.blindSpot !== "object") {
      result.blindSpot = { perceivedProblem: "", realProblem: "" };
    }
    if (!result.firstAction) result.firstAction = result.proximoPasso || "";
    if (!result.blockingPoint) result.blockingPoint = "";
    if (!result.impact) result.impact = "";
    if (!result.combinedTitle) result.combinedTitle = `${dominant.label}`;
    if (!Array.isArray(result.actionPlan)) result.actionPlan = [];

    return new Response(JSON.stringify({ analysis: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-test error:", e);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
