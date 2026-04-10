import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CreditCard, QrCode, Check, Loader2,
  Shield, Copy, CheckCircle2, RefreshCw, AlertCircle, ArrowRight, Users, Brain, Zap,
} from 'lucide-react';
import { toast } from 'sonner';

const PLANS = {
  pessoal_monthly: { key: 'pessoal', label: 'Pessoal', billing: 'monthly', price: 5.99, priceLabel: 'R$ 5,99', period: '/mês', maxPersons: 3, allTests: true },
  pessoal_yearly: { key: 'pessoal', label: 'Pessoal', billing: 'yearly', price: 59.90, priceLabel: 'R$ 59,90', period: '/ano', maxPersons: 3, allTests: true, savings: 'Economize R$ 11,98' },
  profissional_monthly: { key: 'profissional', label: 'Profissional', billing: 'monthly', price: 39.90, priceLabel: 'R$ 39,90', period: '/mês', maxPersons: 15, allTests: true },
  profissional_yearly: { key: 'profissional', label: 'Profissional', billing: 'yearly', price: 399.90, priceLabel: 'R$ 399,90', period: '/ano', maxPersons: 15, allTests: true, savings: 'Economize R$ 78,90' },
};

type PlanKey = keyof typeof PLANS;
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
  const { isPremium, isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('plan');
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('pessoal_monthly');
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

  const plan = PLANS[selectedPlan];

  const handleCheckout = async () => {
    setProcessing(true);
    setStep('processing');
    try {
      const { data, error } = await supabase.functions.invoke('asaas-checkout', {
        body: { plan: plan.billing, billingType, planType: plan.key },
      });
      if (error || data?.error) {
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
        toast.success('Pagamento confirmado!');
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
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
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
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
              isActive ? 'bg-foreground text-background' : isDone ? 'bg-foreground/10 text-foreground' : 'bg-secondary text-muted-foreground'
            }`}>
              {isDone ? <Check className="w-3 h-3" /> : i + 1}
            </div>
            <span className={`text-xs font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground/50'}`}>{label}</span>
            {i < 2 && <div className={`w-6 h-px ${isDone ? 'bg-foreground/20' : 'bg-border'}`} />}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => step === 'plan' ? navigate(-1) : setStep('plan')}
            className="p-1.5 rounded-md hover:bg-secondary transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <h1 className="text-lg font-semibold tracking-tight">Escolha seu plano</h1>
        </div>

        {stepIndicator}

        <AnimatePresence mode="wait">
          {/* STEP 1: Plan Selection */}
          {step === 'plan' && (
            <motion.div
              key="plan"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Plan Cards */}
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Pessoal */}
                <div className={`rounded-xl border-2 p-5 transition-all cursor-pointer ${
                  plan.key === 'pessoal' ? 'border-primary bg-primary/[0.03]' : 'border-border hover:border-primary/30'
                }`} onClick={() => setSelectedPlan('pessoal_monthly')}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Brain className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-semibold">Pessoal</h3>
                  </div>
                  <ul className="space-y-2 text-[0.8rem] text-muted-foreground mb-4">
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary shrink-0" /> Todos os 9 módulos de análise</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary shrink-0" /> 2 testes/mês por categoria</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary shrink-0" /> Até 3 CPFs (você + 2 convidados)</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary shrink-0" /> Convidados: 1x teste comportamental</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary shrink-0" /> Relatórios completos + IA</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary shrink-0" /> Convite por email</li>
                  </ul>
                  {plan.key === 'pessoal' && (
                    <div className="space-y-2">
                      {(['pessoal_monthly', 'pessoal_yearly'] as PlanKey[]).map(k => {
                        const p = PLANS[k];
                        const isSelected = selectedPlan === k;
                        return (
                          <button key={k} onClick={(e) => { e.stopPropagation(); setSelectedPlan(k); }}
                            className={`w-full rounded-lg border p-3 text-left transition-colors text-sm ${
                              isSelected ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/20'
                            }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{p.billing === 'monthly' ? 'Mensal' : 'Anual'}</span>
                                {'savings' in p && <span className="text-[0.65rem] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{p.savings}</span>}
                              </div>
                              <span className="font-semibold">{p.priceLabel}<span className="text-xs text-muted-foreground">{p.period}</span></span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Profissional */}
                <div className={`rounded-xl border-2 p-5 transition-all cursor-pointer relative ${
                  plan.key === 'profissional' ? 'border-primary bg-primary/[0.03]' : 'border-border hover:border-primary/30'
                }`} onClick={() => setSelectedPlan('profissional_monthly')}>
                  <div className="absolute -top-3 right-4 px-3 py-0.5 bg-primary text-primary-foreground text-[0.65rem] font-bold rounded-full uppercase tracking-wider">
                    Popular
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Zap className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-semibold">Profissional</h3>
                  </div>
                  <ul className="space-y-2 text-[0.8rem] text-muted-foreground mb-4">
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary shrink-0" /> Todos os 9 módulos de análise</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary shrink-0" /> 2 testes/mês por categoria</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary shrink-0" /> Até 15 CPFs</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary shrink-0" /> Todos os testes para todos os perfis</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary shrink-0" /> Ideal para coaches e terapeutas</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary shrink-0" /> Relatórios completos + IA</li>
                  </ul>
                  {plan.key === 'profissional' && (
                    <div className="space-y-2">
                      {(['profissional_monthly', 'profissional_yearly'] as PlanKey[]).map(k => {
                        const p = PLANS[k];
                        const isSelected = selectedPlan === k;
                        return (
                          <button key={k} onClick={(e) => { e.stopPropagation(); setSelectedPlan(k); }}
                            className={`w-full rounded-lg border p-3 text-left transition-colors text-sm ${
                              isSelected ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/20'
                            }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{p.billing === 'monthly' ? 'Mensal' : 'Anual'}</span>
                                {'savings' in p && <span className="text-[0.65rem] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{p.savings}</span>}
                              </div>
                              <span className="font-semibold">{p.priceLabel}<span className="text-xs text-muted-foreground">{p.period}</span></span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Free plan comparison */}
              <div className="border border-border/40 rounded-lg p-4 bg-muted/20">
                <p className="text-xs font-medium text-muted-foreground mb-2">Plano Padrão (Grátis)</p>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground/70">
                  <span>• 1 CPF apenas</span>
                  <span>• Apenas Padrão Comportamental</span>
                  <span>• 1 teste por mês</span>
                </div>
              </div>

              <button
                onClick={() => setStep('payment')}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                Continuar com {plan.label}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}

          {/* STEP 2: Payment */}
          {step === 'payment' && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              {/* Summary */}
              <div className="border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Resumo</p>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium text-foreground">Plano {plan.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">({plan.billing === 'monthly' ? 'Mensal' : 'Anual'})</span>
                  </div>
                  <span className="font-semibold">
                    {plan.priceLabel}<span className="text-xs text-muted-foreground">{plan.period}</span>
                  </span>
                </div>
                <div className="flex gap-3 mt-2 text-xs text-muted-foreground/60">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {plan.maxPersons} CPFs</span>
                  <span>• 2 testes/mês por categoria</span>
                </div>
              </div>

              {/* Payment methods */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pagamento</p>
                <button
                  onClick={() => setBillingType('PIX')}
                  className={`w-full rounded-lg border p-4 text-left transition-colors flex items-center gap-3 ${
                    billingType === 'PIX' ? 'border-foreground bg-secondary/50' : 'border-border hover:border-foreground/20'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <span className="text-sm font-medium">PIX</span>
                    <p className="text-xs text-muted-foreground">Pagamento instantâneo</p>
                  </div>
                  {billingType === 'PIX' && <Check className="w-4 h-4 text-foreground" />}
                </button>
                <button
                  onClick={() => setBillingType('CREDIT_CARD')}
                  className={`w-full rounded-lg border p-4 text-left transition-colors flex items-center gap-3 ${
                    billingType === 'CREDIT_CARD' ? 'border-foreground bg-secondary/50' : 'border-border hover:border-foreground/20'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <span className="text-sm font-medium">Cartão de Crédito</span>
                    <p className="text-xs text-muted-foreground">Cobrança recorrente</p>
                  </div>
                  {billingType === 'CREDIT_CARD' && <Check className="w-4 h-4 text-foreground" />}
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Shield className="w-3.5 h-3.5" />
                Pagamento seguro · Dados criptografados
              </div>

              <button
                onClick={handleCheckout}
                disabled={processing}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
                ) : (
                  <>Assinar {plan.priceLabel}{plan.period}</>
                )}
              </button>
            </motion.div>
          )}

          {/* STEP 3: Processing */}
          {step === 'processing' && (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <p className="text-sm font-medium">Gerando pagamento...</p>
            </motion.div>
          )}

          {/* STEP 4: PIX / CC Waiting */}
          {step === 'pix-waiting' && (
            <motion.div key="pix-waiting" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }} className="space-y-5">
              {paymentInfo?.type === 'PIX' && paymentInfo.qrCodeImage ? (
                <div className="border border-border rounded-lg p-6 text-center space-y-4">
                  <h2 className="text-base font-semibold">Pague com PIX</h2>
                  <p className="text-xs text-muted-foreground">Escaneie o QR Code ou copie o código</p>
                  <div className="flex justify-center">
                    <div className="p-3 bg-white rounded-lg">
                      <img src={`data:image/png;base64,${paymentInfo.qrCodeImage}`} alt="QR Code PIX" className="w-48 h-48" />
                    </div>
                  </div>
                  {paymentInfo.qrCodePayload && (
                    <div className="space-y-2">
                      <div className="bg-secondary rounded-md p-3 text-xs text-muted-foreground font-mono break-all max-h-16 overflow-auto">
                        {paymentInfo.qrCodePayload}
                      </div>
                      <button onClick={copyPixCode}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-secondary transition-colors">
                        {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copiado!' : 'Copiar código'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border border-border rounded-lg p-6 text-center space-y-3">
                  <CreditCard className="w-6 h-6 text-muted-foreground mx-auto" />
                  <h2 className="text-base font-semibold">Finalize o pagamento</h2>
                  <p className="text-xs text-muted-foreground">Uma nova aba foi aberta.</p>
                  {paymentInfo?.invoiceUrl && (
                    <a href={paymentInfo.invoiceUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                      Abrir página de pagamento
                    </a>
                  )}
                </div>
              )}

              <div className="border border-border rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Aguardando confirmação</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Após o pagamento, clique abaixo para verificar.</p>
                </div>
              </div>

              <button onClick={checkPaymentStatus} disabled={checkingStatus}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50">
                {checkingStatus ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>
                ) : (
                  <><RefreshCw className="w-3.5 h-3.5" /> Já paguei — verificar</>
                )}
              </button>
            </motion.div>
          )}

          {/* STEP 5: Success */}
          {step === 'success' && (
            <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center py-20 gap-5 text-center">
              <CheckCircle2 className="w-10 h-10 text-foreground/60" />
              <div>
                <h2 className="text-xl font-semibold">Bem-vindo ao {plan.label}!</h2>
                <p className="text-sm text-muted-foreground mt-1">Seu acesso foi ativado.</p>
              </div>
              <button onClick={() => navigate('/premium')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                Acessar plataforma
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
