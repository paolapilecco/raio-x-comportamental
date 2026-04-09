import { motion } from 'framer-motion';
import { ArrowRight, Check, Zap, Crown, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PricingSection = () => {
  const navigate = useNavigate();

  const plans = [
    {
      icon: Zap,
      name: 'Gratuito',
      tagline: 'Para sempre',
      price: 'R$ 0',
      period: '',
      highlight: false,
      cta: 'Começar agora',
      ctaAction: () => navigate('/auth'),
      features: [
        '1 leitura comportamental completa',
        'Relatório com padrão dominante',
        'Ciclo de autossabotagem mapeado',
        'Exportação em PDF',
        '1 perfil ativo',
      ],
      limit: 'Perfeito para sua primeira descoberta',
    },
    {
      icon: Crown,
      name: 'Pessoal',
      tagline: 'Mais popular',
      price: 'R$ 5,99',
      period: '/mês',
      highlight: true,
      cta: 'Desbloquear acesso',
      ctaAction: () => navigate('/checkout'),
      features: [
        'Todos os módulos de análise',
        'Até 18 leituras/mês',
        'Perfil Central com evolução',
        'Comparação entre leituras',
        'Até 3 perfis ativos',
        'Estratégia de saída por IA',
      ],
      limit: 'ou R$ 59,90/ano (economize 17%)',
    },
    {
      icon: Building2,
      name: 'Profissional',
      tagline: 'Para clínicas',
      price: 'R$ 39,90',
      period: '/mês',
      highlight: false,
      cta: 'Começar agora',
      ctaAction: () => navigate('/checkout'),
      features: [
        'Tudo do plano Pessoal',
        'Até 15 pacientes/clientes',
        '18 leituras/mês por perfil',
        'Convite por link (sem cadastro)',
        'Notas clínicas por sessão',
        'Relatórios prontos para sessão',
      ],
      limit: 'Ideal para psicólogos e terapeutas',
    },
  ];

  return (
    <section className="px-6 py-24 md:py-32 bg-background" id="planos">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p className="text-[11px] font-medium text-accent uppercase tracking-[0.2em] mb-3">
            Planos
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Comece grátis. Evolua quando quiser.
          </h2>
          <p className="text-sm text-muted-foreground mt-4 max-w-lg mx-auto">
            Sua primeira leitura é gratuita e completa — sem cartão, sem compromisso.
            Desbloqueie todo o potencial quando estiver pronta.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
              className={`relative p-7 rounded-2xl border flex flex-col ${
                plan.highlight
                  ? 'border-accent/40 bg-accent/5 shadow-[0_0_60px_rgba(198,169,105,0.08)]'
                  : 'border-border/40 bg-card/60'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full bg-accent text-[10px] font-bold text-white uppercase tracking-wider">
                    {plan.tagline}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-5">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  plan.highlight ? 'bg-accent/20' : 'bg-secondary'
                }`}>
                  <plan.icon className={`w-4 h-4 ${plan.highlight ? 'text-accent' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{plan.name}</p>
                  {!plan.highlight && (
                    <p className="text-[10px] text-muted-foreground/60">{plan.tagline}</p>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <span className="text-3xl font-bold tracking-tight text-foreground">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-2.5">
                    <Check className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                      plan.highlight ? 'text-accent' : 'text-muted-foreground/40'
                    }`} />
                    <span className="text-sm text-foreground/70">{feature}</span>
                  </li>
                ))}
              </ul>

              <p className="text-[11px] text-muted-foreground/50 mb-4 text-center">{plan.limit}</p>

              <button
                onClick={plan.ctaAction}
                className={`w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  plan.highlight
                    ? 'bg-gradient-to-r from-[hsl(41,50%,45%)] via-[hsl(41,55%,55%)] to-[hsl(41,50%,45%)] text-white shadow-[0_0_30px_rgba(198,169,105,0.2)] hover:shadow-[0_0_50px_rgba(198,169,105,0.3)] hover:scale-[1.02]'
                    : 'bg-secondary text-foreground hover:bg-secondary/80'
                }`}
              >
                {plan.cta}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
