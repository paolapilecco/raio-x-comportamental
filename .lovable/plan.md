
## Diagnóstico do Bug

A etapa **3 (Template)** no "Fluxo do Pipeline" usa esta verificação em `src/pages/AdminPrompts.tsx` (linhas 30, 39-40):

```ts
{ key: 'template', check: (_, hasTemplate) => hasTemplate }
// hasTemplate = !!(data && (data.sections as any[])?.length > 0)
```

Ou seja, ele só fica verde se `sections` for um **array com length > 0**.

**Mas o `ReportTemplatePanel` salva `sections` como um OBJETO** (linha 207):
```ts
sections: { acts: template.acts, rules: template.rules }
```

Um objeto não tem `.length`, então `(data.sections as any[])?.length > 0` é sempre `undefined > 0` → `false`. **Por isso a etapa 3 nunca fica verde**, mesmo que o storyboard (Atos 1/2/3, Regras de Composição, Regras de Saída) esteja completamente preenchido e salvo.

## Correção

Em `src/pages/AdminPrompts.tsx`, ajustar o `check` da linha 39-40 para reconhecer o formato novo (objeto com `acts`):

```ts
const { data } = await supabase
  .from('report_templates')
  .select('id, sections')
  .eq('test_id', module.id)
  .maybeSingle();

const sections = data?.sections as any;
const hasNewFormat = sections?.acts && Array.isArray(sections.acts) && sections.acts.length > 0;
const hasLegacy = Array.isArray(sections) && sections.length > 0;
setHasTemplate(!!(hasNewFormat || hasLegacy));
```

Isso cobre:
- **Formato novo (storyboard 3 atos)**: objeto `{ acts: [...], rules: {...} }`
- **Formato legado**: array direto

Depois disso, a etapa 3 ficará verde para todos os módulos que já têm storyboard salvo (mesmo apenas o default), e o badge superior passará para `4/4 etapas`.

## Mudança
- **Arquivo**: `src/pages/AdminPrompts.tsx`
- **Linhas**: 37-43 (função `check` dentro do `useEffect` do `PipelineFlowIndicator`)
- **Risco**: nenhum — apenas leitura, lógica isolada no indicador visual
