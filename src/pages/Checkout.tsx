import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Crown, ArrowLeft, CreditCard, QrCode, Check, Loader2,
  Sparkles, Shield, Copy, CheckCircle2, RefreshCw, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const PLANS = {
  monthly: { label: 'Mensal', price: 4.99, priceLabel: 'R$ 4,99', period: '/mês' },
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

  // Redirect if already premium
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
          // Open Asaas payment page for credit card
          window.open(data.payment.invoiceUrl, '_blank');
          setStep('pix-waiting'); // Reuse waiting screen
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
        toast.success('Pagamento confirmado! Bem-vindo ao Premium! 🎉');
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => step === 'plan' ? navigate(-1) : setStep('plan')}
            className="p-2 rounded-lg hover:bg-accent/10 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-serif">Assinar Premium</h1>
            <p className="text-sm text-muted-foreground">Desbloqueie todo o potencial da plataforma</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: Choose Plan */}
          {step === 'plan' && (
            <motion.div
              key="plan"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Benefits */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-accent" />
                  <h2 className="font-semibold text-foreground">O que está incluído</h2>
                </div>
                <ul className="space-y-3">
                  {[
                    'Todos os módulos de análise desbloqueados',
                    'Relatórios detalhados com IA avançada',
                    'Acompanhamento evolutivo completo',
                    'Histórico ilimitado de diagnósticos',
                    'Recomendações personalizadas',
                  ].map((benefit, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-foreground">
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Plan Selection */}
              <div className="space-y-3">
                <h2 className="font-semibold text-foreground">Escolha seu plano</h2>
                  {(['monthly', 'yearly'] as PlanType[]).map((key) => {
                    const plan = PLANS[key];
                    return (
                  <button
                    key={key}
                    onClick={() => setSelectedPlan(key)}
                    className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                      selectedPlan === key
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border bg-card hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{plan.label}</span>
                          {'savings' in plan && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 font-medium">
                              {plan.savings}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {key === 'yearly' ? 'Equivale a R$ 4,16/mês' : 'Cobrado mensalmente'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-foreground">{plan.priceLabel}</span>
                        <span className="text-sm text-muted-foreground">{plan.period}</span>
                      </div>
                    </div>
                    {selectedPlan === key && (
                      <div className="mt-2 flex items-center gap-1.5 text-primary text-xs font-medium">
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
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                Continuar
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            </motion.div>
          )}

          {/* STEP 2: Choose Payment Method */}
          {step === 'payment' && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="font-semibold text-foreground mb-1">Resumo</h2>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Plano {PLANS[selectedPlan].label}
                  </span>
                  <span className="font-bold text-foreground">
                    {PLANS[selectedPlan].priceLabel}{PLANS[selectedPlan].period}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="font-semibold text-foreground">Forma de pagamento</h2>

                <button
                  onClick={() => setBillingType('PIX')}
                  className={`w-full rounded-xl border-2 p-4 text-left transition-all flex items-center gap-4 ${
                    billingType === 'PIX'
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:border-primary/30'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <QrCode className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">PIX</span>
                    <p className="text-xs text-muted-foreground">Pagamento instantâneo</p>
                  </div>
                  {billingType === 'PIX' && <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />}
                </button>

                <button
                  onClick={() => setBillingType('CREDIT_CARD')}
                  className={`w-full rounded-xl border-2 p-4 text-left transition-all flex items-center gap-4 ${
                    billingType === 'CREDIT_CARD'
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:border-primary/30'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Cartão de Crédito</span>
                    <p className="text-xs text-muted-foreground">Cobrança recorrente automática</p>
                  </div>
                  {billingType === 'CREDIT_CARD' && <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />}
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>Pagamento seguro processado pelo Asaas</span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={processing}
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
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
              className="flex flex-col items-center justify-center py-20 gap-4"
            >
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-foreground font-medium">Gerando seu pagamento...</p>
              <p className="text-sm text-muted-foreground">Isso pode levar alguns segundos</p>
            </motion.div>
          )}

          {/* STEP 4: PIX Waiting / Credit Card Waiting */}
          {step === 'pix-waiting' && (
            <motion.div
              key="pix-waiting"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {paymentInfo?.type === 'PIX' && paymentInfo.qrCodeImage ? (
                <div className="rounded-xl border border-border bg-card p-6 text-center space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <QrCode className="w-5 h-5 text-green-600" />
                    <h2 className="font-semibold text-foreground">Pague com PIX</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Escaneie o QR Code ou copie o código abaixo
                  </p>

                  <div className="flex justify-center">
                    <img
                      src={`data:image/png;base64,${paymentInfo.qrCodeImage}`}
                      alt="QR Code PIX"
                      className="w-56 h-56 rounded-lg border border-border"
                    />
                  </div>

                  {paymentInfo.qrCodePayload && (
                    <div className="space-y-2">
                      <div className="bg-muted rounded-lg p-3 text-xs text-muted-foreground font-mono break-all max-h-20 overflow-auto">
                        {paymentInfo.qrCodePayload}
                      </div>
                      <button
                        onClick={copyPixCode}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                      >
                        {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copiado!' : 'Copiar código PIX'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-card p-6 text-center space-y-4">
                  <CreditCard className="w-10 h-10 text-blue-600 mx-auto" />
                  <h2 className="font-semibold text-foreground">Finalize o pagamento</h2>
                  <p className="text-sm text-muted-foreground">
                    Uma nova aba foi aberta para você completar o pagamento com cartão de crédito.
                  </p>
                  {paymentInfo?.invoiceUrl && (
                    <a
                      href={paymentInfo.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      Abrir página de pagamento
                    </a>
                  )}
                </div>
              )}

              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-foreground font-medium">Aguardando confirmação</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Após o pagamento, clique no botão abaixo para verificar. A confirmação pode levar alguns minutos.
                  </p>
                </div>
              </div>

              <button
                onClick={checkPaymentStatus}
                disabled={checkingStatus}
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
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
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-16 gap-6 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground font-serif">Bem-vindo ao Premium! 🎉</h2>
                <p className="text-muted-foreground mt-2">
                  Seu acesso foi ativado com sucesso. Aproveite todos os recursos!
                </p>
              </div>
              <button
                onClick={() => navigate('/premium')}
                className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
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
