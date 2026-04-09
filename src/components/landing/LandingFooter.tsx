const LandingFooter = () => {
  return (
    <footer className="border-t border-border/30 px-6 py-8" role="contentinfo">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-sm font-semibold text-foreground/70 tracking-tight">Raio-X Mental</span>
          <p className="text-[11px] text-muted-foreground/40 mt-0.5">
            Diagnóstico comportamental de precisão clínica
          </p>
        </div>
        <p className="text-[10px] text-muted-foreground/30">
          © {new Date().getFullYear()} Raio-X Mental · Todos os direitos reservados
        </p>
      </div>
    </footer>
  );
};

export default LandingFooter;
