
-- Drop the old FK referencing tests
ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_test_id_fkey;

-- Add new FK referencing test_modules
ALTER TABLE public.questions
  ADD CONSTRAINT questions_test_module_id_fkey
  FOREIGN KEY (test_id) REFERENCES public.test_modules(id) ON DELETE CASCADE;

-- Insert behavioral pattern questions (test_module: Padrão Comportamental)
INSERT INTO public.questions (test_id, text, axes, weight, sort_order) VALUES
  ('e56ef334-af3b-475c-b7cb-c5215b991d89', 'Eu começo projetos ou mudanças com muita energia, mas perco o ritmo antes de concluir.', ARRAY['unstable_execution'], 1, 1),
  ('e56ef334-af3b-475c-b7cb-c5215b991d89', 'Minha motivação depende muito de como eu me sinto no dia.', ARRAY['unstable_execution','emotional_self_sabotage'], 1, 2),
  ('e56ef334-af3b-475c-b7cb-c5215b991d89', 'Tenho dificuldade em manter o mesmo padrão de esforço por mais de duas semanas seguidas.', ARRAY['unstable_execution','low_routine_sustenance'], 1, 3),
  ('e56ef334-af3b-475c-b7cb-c5215b991d89', 'Quando estou prestes a avançar em algo importante, costumo encontrar um motivo para parar.', ARRAY['emotional_self_sabotage'], 1, 4),
  ('e56ef334-af3b-475c-b7cb-c5215b991d89', 'Já desisti de algo que estava funcionando por medo de não dar conta de manter.', ARRAY['emotional_self_sabotage','paralyzing_perfectionism'], 1, 5),
  ('e56ef334-af3b-475c-b7cb-c5215b991d89', 'Em momentos de pressão, minha primeira reação é recuar ou paralisar.', ARRAY['emotional_self_sabotage','discomfort_escape'], 1, 6),
  ('e56ef334-af3b-475c-b7cb-c5215b991d89', 'Estou sempre ocupado, mas sinto que não avanço de verdade.', ARRAY['functional_overload'], 1, 7),
  ('e56ef334-af3b-475c-b7cb-c5215b991d89', 'Tenho dificuldade em dizer não e acabo acumulando mais do que consigo dar conta.', ARRAY['functional_overload','validation_dependency'], 1, 8),
  ('e56ef334-af3b-475c-b7cb-c5215b991d89', 'Minha mente está constantemente planejando, pensando ou revisando coisas.', ARRAY['functional_overload','excessive_self_criticism'], 1, 9),
  ('e56ef334-af3b-475c-b7cb-c5215b991d89', 'Quando algo me gera desconforto, prefiro trocar de atividade do que enfrentar.', ARRAY['discomfort_escape'], 1, 10),
  ('e56ef334-af3b-475c-b7cb-c5215b991d89', 'Adio tarefas importantes com frequência, mesmo sabendo que isso me prejudica.', ARRAY['discomfort_escape','unstable_execution'], 1, 11),
  ('e56ef334-af3b-475c-b7cb-c5215b991d89', 'Uso distrações (celular, redes sociais, séries) para não lidar com o que precisa ser feito.', ARRAY['discomfort_escape'], 1, 12),
  ('e56ef334-af3b-475c-b7cb-c5215b991d89', 'Só começo algo quando sinto que tenho condições ideais para fazer bem feito.', ARRAY['paralyzing_perfectionism'], 1, 13),
  ('e56ef334-af3b-475c-b7cb-c5215b991d89', 'Prefiro não entregar nada do que entregar algo que considero abaixo do meu padrão.', ARRAY['paralyzing_perfectionism','excessive_self_criticism'], 1, 14),
  ('e56ef334-af3b-475c-b7cb-c5215b991d89', 'Gasto tempo demais refinando detalhes e acabo atrasando o que importa.', ARRAY['paralyzing_perfectionism','functional_overload'], 1, 15),
  ('e56ef334-af3b-475c-b7cb-c5215b991d89', 'Antes de tomar uma decisão, costumo buscar a opinião de outras pessoas.', ARRAY['validation_dependency'], 1, 16),
  ('e56ef334-af3b-475c-b7cb-c5215b991d89', 'Quando alguém critica algo que fiz, tenho dificuldade em separar a crítica da minha identidade.', ARRAY['validation_dependency','excessive_self_criticism'], 1, 17),
  ('e56ef334-af3b-475c-b7cb-c5215b991d89', 'Faço muitas coisas mais para agradar os outros do que por vontade própria.', ARRAY['validation_dependency'], 1, 18),
  ('e56ef334-af3b-475c-b7cb-c5215b991d89', 'Mesmo quando faço algo bom, costumo focar no que poderia ter sido melhor.', ARRAY['excessive_self_criticism'], 1, 19),
  ('e56ef334-af3b-475c-b7cb-c5215b991d89', 'Tenho uma voz interna muito dura que me cobra o tempo todo.', ARRAY['excessive_self_criticism','emotional_self_sabotage'], 1, 20),
  ('e56ef334-af3b-475c-b7cb-c5215b991d89', 'Sinto culpa quando descanso ou quando não sou produtivo.', ARRAY['excessive_self_criticism','functional_overload'], 1, 21),
  ('e56ef334-af3b-475c-b7cb-c5215b991d89', 'Consigo criar bons planos, mas falho na hora de manter a execução diária.', ARRAY['low_routine_sustenance','unstable_execution'], 1, 22),
  ('e56ef334-af3b-475c-b7cb-c5215b991d89', 'Minha rotina muda muito de uma semana para outra.', ARRAY['low_routine_sustenance'], 1, 23),
  ('e56ef334-af3b-475c-b7cb-c5215b991d89', 'Sinto que preciso de algo externo (prazo, cobrança, urgência) para realmente agir.', ARRAY['low_routine_sustenance','discomfort_escape'], 1, 24);

-- Insert purpose & meaning questions (test_module: Propósito & Sentido de Vida)
INSERT INTO public.questions (test_id, text, axes, weight, sort_order) VALUES
  ('12fa74a9-53e0-4afd-abd8-1c31a57ead37', 'Sinto que minha vida tem uma direção clara e que minhas ações do dia a dia estão conectadas a algo maior.', ARRAY['meaning_orientation'], 1, 1),
  ('12fa74a9-53e0-4afd-abd8-1c31a57ead37', 'Consigo identificar facilmente o que me faz sentir que um dia foi significativo — e o que faz parecer vazio.', ARRAY['meaning_orientation','fulfillment_level'], 1, 2),
  ('12fa74a9-53e0-4afd-abd8-1c31a57ead37', 'Quando penso no que eu gostaria de construir na vida, a resposta vem com clareza e não com ansiedade.', ARRAY['meaning_orientation','internal_conflict'], 1, 3),
  ('12fa74a9-53e0-4afd-abd8-1c31a57ead37', 'Meu dia a dia reflete quem eu realmente sou — e não apenas o que esperam de mim.', ARRAY['identity_alignment'], 1, 4),
  ('12fa74a9-53e0-4afd-abd8-1c31a57ead37', 'Sinto que estou vivendo uma vida que eu escolhi, e não uma vida que fui empurrado para viver.', ARRAY['identity_alignment','external_pressure'], 1, 5),
  ('12fa74a9-53e0-4afd-abd8-1c31a57ead37', 'Quando me imagino daqui a 5 anos, a visão me anima em vez de me assustar.', ARRAY['identity_alignment','meaning_orientation'], 1, 6),
  ('12fa74a9-53e0-4afd-abd8-1c31a57ead37', 'Existe uma distância entre o que eu quero da vida e o que eu estou realmente fazendo com ela.', ARRAY['internal_conflict'], 1, 7),
  ('12fa74a9-53e0-4afd-abd8-1c31a57ead37', 'Sinto que tenho duas versões de mim: uma que sabe o que quer e outra que não consegue agir sobre isso.', ARRAY['internal_conflict','avoidance'], 1, 8),
  ('12fa74a9-53e0-4afd-abd8-1c31a57ead37', 'Frequentemente sinto um incômodo difuso, como se algo estivesse "errado" mas eu não consigo nomear exatamente o quê.', ARRAY['internal_conflict','fulfillment_level'], 1, 9),
  ('12fa74a9-53e0-4afd-abd8-1c31a57ead37', 'Tenho momentos frequentes onde me sinto vivo, curioso e genuinamente interessado no que estou fazendo.', ARRAY['emotional_engagement'], 1, 10),
  ('12fa74a9-53e0-4afd-abd8-1c31a57ead37', 'Consigo me envolver profundamente em atividades a ponto de perder a noção do tempo.', ARRAY['emotional_engagement','self_expression'], 1, 11),
  ('12fa74a9-53e0-4afd-abd8-1c31a57ead37', 'Minha energia sobe quando encontro problemas complexos que considero importantes.', ARRAY['emotional_engagement','meaning_orientation'], 1, 12),
  ('12fa74a9-53e0-4afd-abd8-1c31a57ead37', 'Evito pensar no futuro porque isso me gera angústia ou sensação de vazio.', ARRAY['avoidance'], 1, 13),
  ('12fa74a9-53e0-4afd-abd8-1c31a57ead37', 'Preencho meu tempo com atividades que me distraem de questões mais profundas sobre minha vida.', ARRAY['avoidance','fulfillment_level'], 1, 14),
  ('12fa74a9-53e0-4afd-abd8-1c31a57ead37', 'Quando alguém me pergunta "o que você quer da vida?", sinto desconforto em vez de clareza.', ARRAY['avoidance','internal_conflict'], 1, 15),
  ('12fa74a9-53e0-4afd-abd8-1c31a57ead37', 'Muitas das minhas decisões de vida foram tomadas para atender expectativas de outras pessoas.', ARRAY['external_pressure'], 1, 16),
  ('12fa74a9-53e0-4afd-abd8-1c31a57ead37', 'Sinto que preciso justificar minhas escolhas para que os outros as considerem válidas.', ARRAY['external_pressure','identity_alignment'], 1, 17),
  ('12fa74a9-53e0-4afd-abd8-1c31a57ead37', 'Já deixei de seguir algo que me interessava porque "não daria dinheiro" ou "não era prático".', ARRAY['external_pressure','avoidance'], 1, 18),
  ('12fa74a9-53e0-4afd-abd8-1c31a57ead37', 'Tenho espaço na minha vida para expressar quem eu realmente sou — sem filtros ou máscaras.', ARRAY['self_expression'], 1, 19),
  ('12fa74a9-53e0-4afd-abd8-1c31a57ead37', 'Quando falo sobre o que realmente me importa, as pessoas ao meu redor entendem e respeitam.', ARRAY['self_expression','identity_alignment'], 1, 20),
  ('12fa74a9-53e0-4afd-abd8-1c31a57ead37', 'Sinto que meus talentos naturais estão sendo usados no meu dia a dia — não apenas guardados.', ARRAY['self_expression','emotional_engagement'], 1, 21),
  ('12fa74a9-53e0-4afd-abd8-1c31a57ead37', 'No final do dia, raramente sinto que desperdicei meu tempo — sinto que vivi de verdade.', ARRAY['fulfillment_level'], 1, 22),
  ('12fa74a9-53e0-4afd-abd8-1c31a57ead37', 'Sinto um vazio recorrente que não consigo explicar, mesmo quando "está tudo bem" na superfície.', ARRAY['fulfillment_level','internal_conflict'], 1, 23),
  ('12fa74a9-53e0-4afd-abd8-1c31a57ead37', 'Se eu pudesse recomeçar, escolheria um caminho muito diferente do que estou vivendo agora.', ARRAY['fulfillment_level','identity_alignment'], 1, 24);

-- Update test_modules question_count
UPDATE public.test_modules SET question_count = 24 WHERE id = 'e56ef334-af3b-475c-b7cb-c5215b991d89';
UPDATE public.test_modules SET question_count = 24 WHERE id = '12fa74a9-53e0-4afd-abd8-1c31a57ead37';
