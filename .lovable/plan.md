

## Diagnóstico do Erro "Erro ao criar conta. Tente novamente."

Os logs do servidor de autenticação mostram que `POST /signup` retornou **HTTP 422** (acionado nas últimas tentativas a partir de `raio-xmental.com.br/dashboard`). Esse status é devolvido pelo Supabase Auth nestes casos:

1. **Email já cadastrado** (causa mais provável aqui)
2. Senha fraca / abaixo da política
3. Email rejeitado por validação (formato/domínio)
4. "Signup desabilitado" no projeto

O código atual em `src/pages/Auth.tsx` só reconhece a string literal `"already registered"`. O Supabase pode retornar mensagens diferentes (`User already registered`, `email_address_already_registered`, `user_already_exists`) e expõe um campo `error.code` mais confiável que a `error.message`. Como nenhuma variação bate, o código cai no genérico **"Erro ao criar conta. Tente novamente."** — exatamente o que você está vendo no toast.

Em outras palavras: **o cadastro provavelmente está sendo recusado porque o email já existe** (você testou login antes e o usuário já está na base), mas a UI não consegue traduzir esse erro corretamente.

## Plano de Correção

**Único arquivo alterado**: `src/pages/Auth.tsx` (bloco de tratamento do `signUp`, linhas ~85-95)

### Melhorias no tratamento de erro de signup
Trocar a checagem frágil baseada em string única por uma matriz que cobre todos os retornos conhecidos do Supabase, usando tanto `error.code` quanto `error.message` (lowercase) e `error.status`:

| Condição detectada | Mensagem amigável + ação |
|---|---|
| `code === 'user_already_exists'` ou message contém `already registered` / `already exists` / `user already` | **"Este email já está cadastrado."** + botão de ação **"Fazer login"** que alterna para o modo login com o email pré-preenchido, e botão secundário **"Esqueci minha senha"** |
| `code === 'weak_password'` ou message contém `password` + `weak`/`short` | **"Senha muito fraca. Use ao menos 6 caracteres com letras e números."** |
| `code === 'over_email_send_rate_limit'` ou status 429 | **"Muitas tentativas. Aguarde alguns minutos e tente novamente."** |
| `code === 'email_address_invalid'` ou message contém `invalid email` | **"Email inválido. Verifique e tente novamente."** |
| `code === 'signup_disabled'` | **"Cadastro temporariamente indisponível. Entre com Google ou tente mais tarde."** |
| Qualquer outro | **"Não foi possível criar a conta agora. Tente novamente em instantes."** (mensagem genérica + `console.error` com o erro real para debug) |

### Logging para debug futuro
Adicionar `console.error('signUp error:', error)` antes do `toast`, para que próximos casos diferentes apareçam no console do navegador e sejam capturados pelo painel de runtime errors da Lovable.

### Sem mudanças em backend / triggers / RLS
Os triggers `assign_admin_on_signup` e `handle_new_user_role` foram inspecionados e estão íntegros (ambos `SECURITY DEFINER` com `ON CONFLICT DO NOTHING`). O 422 vem da camada de validação do GoTrue, não do banco — nenhuma migração é necessária.

### Checagem de segurança
Será executada após a edição (`security--run_security_scan`) para garantir 0 vulnerabilidades novas. Mudança é puramente client-side (UI/UX de tratamento de erro), sem expor dados sensíveis.

## Próximo Passo Após Aplicar
Você poderá tentar criar conta novamente — se o email já existir, o toast vai dizer isso explicitamente e oferecer um botão para alternar para o login (ou recuperar senha), eliminando a confusão atual.

