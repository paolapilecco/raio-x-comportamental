
CREATE TABLE public.admin_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  context TEXT NOT NULL,
  label TEXT NOT NULL,
  prompt_text TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (context)
);

ALTER TABLE public.admin_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view prompts"
ON public.admin_prompts FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert prompts"
ON public.admin_prompts FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update prompts"
ON public.admin_prompts FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete prompts"
ON public.admin_prompts FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_admin_prompts_updated_at
BEFORE UPDATE ON public.admin_prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default prompt contexts
INSERT INTO public.admin_prompts (context, label, prompt_text) VALUES
('test_analysis', 'Análise de Teste', 'Analise os resultados do teste comportamental considerando os eixos avaliados e gere um diagnóstico preciso.'),
('report_generation', 'Geração de Relatório', 'Gere um relatório detalhado e personalizado com base nos padrões identificados.'),
('central_profile', 'Perfil Central Unificado', 'Consolide os resultados de múltiplos testes em um perfil comportamental unificado.'),
('insight_generation', 'Geração de Insights', 'Identifique padrões ocultos, contradições e recomendações práticas com base no histórico do usuário.'),
('exit_strategy', 'Estratégia de Saída', 'Sugira caminhos práticos e acionáveis para o usuário superar os bloqueios identificados.');
