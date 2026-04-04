const AnalyzingScreen = () => {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center space-y-6">
        <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto" />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Analisando seus padrões</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Cruzando dados comportamentais e gerando seu relatório...
          </p>
        </div>
      </div>
    </div>
  );
};

export default AnalyzingScreen;
