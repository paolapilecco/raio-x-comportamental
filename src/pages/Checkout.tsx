import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Crown, ArrowLeft, CreditCard, QrCode, Check, Loader2,
  Sparkles, Shield, Copy, CheckCircle2, RefreshCw, AlertCircle, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

const PLANS = {
  monthly: { label: 'Mensal', price: 5.00, priceLabel: 'R$ 5,00', period: '/mês' },
  yearly: { label: 'Anual', price: 49.90, priceLabel: 'R$ 49,90', period: '/ano', savings: 'Economize R$ 9,98' },
};

type PlanType = 'monthly' | 'yearly';
type BillingType = 'PIX' | 'CREDIT_CARD';
type Step = 'plan' | 'payment' | 'processing' | 'success' | 'pix-waiting';

interface PaymentInfo {
  type: string;
  paymentId?: string;
  qrCodeImage?: string;
  qrCodePayload?: string;
  invoiceUrl?: string;
}

export default function Checkout() {
  const { user, isPremium, isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('plan');
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('yearly');
  const [billingType, setBillingType] = useState<BillingType>('PIX');
  const [processing, setProcessing] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    if (!authLoading && (isPremium || isSuperAdmin)) {
      navigate('/premium', { replace: true });
    }
  }, [authLoading, isPremium, isSuperAdmin]);

  const handleCheckout = async () => {
    setProcessing(true);
    setStep('processing');
    try {
      const { data, error } = await supabase.functions.invoke('asaas-checkout', {
        body: { plan: selectedPlan, billingType },
      });
      if (error || data?.error) {
        console.error('Checkout error:', error || data?.error);
        toast.error(data?.error || 'Erro ao processar pagamento. Tente novamente.');
        setStep('payment');
        setProcessing(false);
        return;
      }
      if (data?.payment) {
        setPaymentInfo(data.payment);
        if (data.payment.type === 'PIX') {
          setStep('pix-waiting');
        } else if (data.payment.invoiceUrl) {
          window.open(data.payment.invoiceUrl, '_blank');
          setStep('pix-waiting');
        }
      } else {
        toast.error('Erro ao gerar pagamento. Tente novamente.');
        setStep('payment');
      }
    } catch (e) {
      console.error('Checkout exception:', e);
      toast.error('Erro inesperado. Tente novamente.');
      setStep('payment');
    }
    setProcessing(false);
  };

  const checkPaymentStatus = async () => {
    setCheckingStatus(true);
    try {
      const { data, error } = await supabase.functions.invoke('asaas-status');
      if (!error && data?.subscription?.status === 'active') {
        setStep('success');
        toast.success('Pagamento confirmado! Bem-vindo ao Premium!');
      } else if (data?.payment?.qrCodeImage) {
        setPaymentInfo(data.payment);
        toast.info('Pagamento ainda pendente. Aguardando confirmação...');
      } else {
        toast.info('Pagamento ainda pendente. Aguardando confirmação...');
      }
    } catch (e) {
      toast.error('Erro ao verificar status.');
    }
    setCheckingStatus(false);
  };

  const copyPixCode = () => {
    if (paymentInfo?.qrCodePayload) {
      navigator.clipboard.writeText(paymentInfo.qrCodePayload);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const stepIndicator = (
    <div className="flex items-center gap-2 mb-8">
      {['Plano', 'Pagamento', 'Confirmação'].map((label, i) => {
        const stepIndex = step === 'plan' ? 0 : step === 'payment' ? 1 : 2;
        const isActive = i === stepIndex;
        const isDone = i < stepIndex;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[0.68rem] font-bold font-display transition-all duration-300 ${
              isActive ? 'bg-primary text-primary-foreground shadow-[0_4px_16px_-2px_hsl(var(--primary)/0.4)]' : isDone ? 'bg-primary/15 text-primary' : 'bg-muted/50 text-muted-foreground/40'
            }`}>
              {isDone ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-[0.7rem] font-medium font-display tracking-wide ${isActive ? 'text-foreground' : 'text-muted-foreground/40'}`}>{label}</span>
            {i < 2 && <div className={`w-8 h-px ${isDone ? 'bg-primary/30' : 'bg-border/40'}`} />}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Ambient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full bg-gold/[0.04] blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-primary/[0.03] blur-[80px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => step === 'plan' ? navigate(-1) : setStep('plan')}
            className="p-2.5 rounded-xl hover:bg-card/60 border border-transparent hover:border-border/30 transition-all"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5 text-foreground/60" />
          </button>
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-gold/70 font-semibold font-display">Premium</p>
            <h1 className="text-2xl md:text-3xl tracking-[-0.03em]">Assinar Premium</h1>
          </div>
        </div>

        {stepIndicator}

        <AnimatePresence mode="wait">
          {/* STEP 1: Plan */}
          {step === 'plan' && (
            <motion.div
              key="plan"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              {/* Benefits */}
              <div className="rounded-2xl border border-gold/15 bg-gradient-to-br from-gold/[0.03] to-transparent p-6">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="p-2 rounded-xl bg-gold/10">
                    <Sparkles className="w-4 h-4 text-gold" />
                  </div>
                  <h2 className="text-lg font-medium">O que está incluído</h2>
                </div>
                <ul className="space-y-3.5">
                  {[
                    'Todos os módulos de análise desbloqueados',
                    'Relatórios detalhados com IA avançada',
                    'Acompanhamento evolutivo completo',
                    'Histórico ilimitado de diagnósticos',
                    'Recomendações personalizadas',
                  ].map((benefit, i) => (
                    <li key={i} className="flex items-center gap-3 text-[0.84rem] text-foreground/75">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Plan Selection */}
              <div className="space-y-3">
                <h2 className="text-[0.78rem] font-semibold text-foreground/60 tracking-[0.04em] uppercase font-display">Escolha seu plano</h2>
                {(['monthly', 'yearly'] as PlanType[]).map((key) => {
                  const plan = PLANS[key];
                  const isSelected = selectedPlan === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedPlan(key)}
                      className={`w-full rounded-2xl border-2 p-5 text-left transition-all duration-300 ${
                        isSelected
                          ? 'border-primary bg-primary/[0.04] shadow-[0_8px_30px_-10px_hsl(var(--primary)/0.15)]'
                          : 'border-border/40 bg-card/40 hover:border-primary/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="font-semibold text-foreground text-[0.92rem]">{plan.label}</span>
                            {'savings' in plan && (
                              <span className="text-[0.68rem] px-2.5 py-0.5 rounded-full bg-primary/8 text-primary font-semibold font-display">
                                {plan.savings}
                              </span>
                            )}
                          </div>
                          <p className="text-[0.76rem] text-muted-foreground/50 mt-1">
                            {key === 'yearly' ? 'Equivale a R$ 4,16/mês' : 'Cobrado mensalmente'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-semibold text-foreground">{plan.priceLabel}</span>
                          <span className="text-sm text-muted-foreground/50">{plan.period}</span>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="mt-3 flex items-center gap-1.5 text-primary text-[0.75rem] font-medium font-display">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Selecionado
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setStep('payment')}
                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-[0.88rem] hover:opacity-90 transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_8px_30px_-6px_hsl(var(--primary)/0.35)] hover:shadow-[0_12px_40px_-4px_hsl(var(--primary)/0.5)] hover:translate-y-[-1px]"
              >
                Continuar
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* STEP 2: Payment */}
          {step === 'payment' && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              {/* Summary */}
              <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-5">
                <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground/50 font-semibold font-display mb-2">Resumo</p>
                <div className="flex justify-between items-center">
                  <span className="text-[0.85rem] text-foreground/70">Plano {PLANS[selectedPlan].label}</span>
                  <span className="font-semibold text-foreground text-lg">
                    {PLANS[selectedPlan].priceLabel}<span className="text-sm text-muted-foreground/50">{PLANS[selectedPlan].period}</span>
                  </span>
                </div>
              </div>

              {/* Payment methods */}
              <div className="space-y-3">
                <p className="text-[0.78rem] font-semibold text-foreground/60 tracking-[0.04em] uppercase font-display">Forma de pagamento</p>

                <button
                  onClick={() => setBillingType('PIX')}
                  className={`w-full rounded-2xl border-2 p-5 text-left transition-all duration-300 flex items-center gap-4 ${
                    billingType === 'PIX'
                      ? 'border-primary bg-primary/[0.04] shadow-[0_4px_20px_-6px_hsl(var(--primary)/0.12)]'
                      : 'border-border/40 bg-card/40 hover:border-primary/20'
                  }`}
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/8 flex items-center justify-center">
                    <QrCode className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold text-foreground text-[0.9rem]">PIX</span>
                    <p className="text-[0.75rem] text-muted-foreground/50">Pagamento instantâneo</p>
                  </div>
                  {billingType === 'PIX' && <CheckCircle2 className="w-5 h-5 text-primary" />}
                </button>

                <button
                  onClick={() => setBillingType('CREDIT_CARD')}
                  className={`w-full rounded-2xl border-2 p-5 text-left transition-all duration-300 flex items-center gap-4 ${
                    billingType === 'CREDIT_CARD'
                      ? 'border-primary bg-primary/[0.04] shadow-[0_4px_20px_-6px_hsl(var(--primary)/0.12)]'
                      : 'border-border/40 bg-card/40 hover:border-primary/20'
                  }`}
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/8 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold text-foreground text-[0.9rem]">Cartão de Crédito</span>
                    <p className="text-[0.75rem] text-muted-foreground/50">Cobrança recorrente automática</p>
                  </div>
                  {billingType === 'CREDIT_CARD' && <CheckCircle2 className="w-5 h-5 text-primary" />}
                </button>
              </div>

              <div className="flex items-center gap-2 text-[0.72rem] text-muted-foreground/40 font-display">
                <Shield className="w-4 h-4" />
                <span>Pagamento seguro · Dados criptografados</span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={processing}
                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-[0.88rem] hover:opacity-90 transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_8px_30px_-6px_hsl(var(--primary)/0.35)] hover:shadow-[0_12px_40px_-4px_hsl(var(--primary)/0.5)] hover:translate-y-[-1px] disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4" />
                    Assinar {PLANS[selectedPlan].priceLabel}{PLANS[selectedPlan].period}
                  </>
                )}
              </button>
            </motion.div>
          )}

          {/* STEP 3: Processing */}
          {step === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 gap-5"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
              <p className="text-foreground font-medium text-lg">Gerando seu pagamento...</p>
              <p className="text-[0.82rem] text-muted-foreground/50">Isso pode levar alguns segundos</p>
            </motion.div>
          )}

          {/* STEP 4: PIX / CC Waiting */}
          {step === 'pix-waiting' && (
            <motion.div
              key="pix-waiting"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {paymentInfo?.type === 'PIX' && paymentInfo.qrCodeImage ? (
                <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-7 text-center space-y-5">
                  <div className="flex items-center justify-center gap-2.5">
                    <div className="p-2 rounded-xl bg-primary/8">
                      <QrCode className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-lg font-medium">Pague com PIX</h2>
                  </div>
                  <p className="text-[0.82rem] text-muted-foreground/50">
                    Escaneie o QR Code ou copie o código abaixo
                  </p>
                  <div className="flex justify-center">
                    <div className="p-3 rounded-2xl bg-white">
                      <img
                        src={`data:image/png;base64,${paymentInfo.qrCodeImage}`}
                        alt="QR Code PIX"
                        className="w-52 h-52 rounded-lg"
                      />
                    </div>
                  </div>
                  {paymentInfo.qrCodePayload && (
                    <div className="space-y-3">
                      <div className="bg-muted/30 rounded-xl p-3 text-[0.72rem] text-muted-foreground/60 font-mono break-all max-h-20 overflow-auto border border-border/30">
                        {paymentInfo.qrCodePayload}
                      </div>
                      <button
                        onClick={copyPixCode}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/10 text-primary text-[0.82rem] font-semibold hover:bg-primary/15 transition-colors"
                      >
                        {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copiado!' : 'Copiar código PIX'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-7 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto">
                    <CreditCard className="w-7 h-7 text-primary" />
                  </div>
                  <h2 className="text-lg font-medium">Finalize o pagamento</h2>
                  <p className="text-[0.82rem] text-muted-foreground/50">
                    Uma nova aba foi aberta para completar o pagamento.
                  </p>
                  {paymentInfo?.invoiceUrl && (
                    <a
                      href={paymentInfo.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-[0.82rem] font-semibold hover:opacity-90 transition-opacity"
                    >
                      Abrir página de pagamento
                    </a>
                  )}
                </div>
              )}

              <div className="rounded-2xl border border-gold/15 bg-gold/[0.03] p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                <div>
                  <p className="text-[0.84rem] text-foreground font-medium">Aguardando confirmação</p>
                  <p className="text-[0.75rem] text-muted-foreground/50 mt-1">
                    Após o pagamento, clique abaixo para verificar. A confirmação pode levar alguns minutos.
                  </p>
                </div>
              </div>

              <button
                onClick={checkPaymentStatus}
                disabled={checkingStatus}
                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-[0.88rem] hover:opacity-90 transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_8px_30px_-6px_hsl(var(--primary)/0.35)] disabled:opacity-50"
              >
                {checkingStatus ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Já paguei — verificar pagamento
                  </>
                )}
              </button>
            </motion.div>
          )}

          {/* STEP 5: Success */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center justify-center py-20 gap-7 text-center"
            >
              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center shadow-[0_8px_30px_-6px_hsl(var(--primary)/0.2)]">
                <CheckCircle2 className="w-10 h-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl">Bem-vindo ao Premium</h2>
                <p className="text-muted-foreground/60 text-[0.88rem]">
                  Seu acesso foi ativado. Aproveite todos os recursos.
                </p>
              </div>
              <button
                onClick={() => navigate('/premium')}
                className="px-10 py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-[0.88rem] hover:opacity-90 transition-all flex items-center gap-2 shadow-[0_8px_30px_-6px_hsl(var(--primary)/0.35)]"
              >
                <Crown className="w-4 h-4" />
                Acessar área Premium
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
