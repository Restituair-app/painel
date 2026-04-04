export function LoadingScreen({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="screen-centered">
      <div className="spinner" aria-hidden="true" />
      <p className="muted-text">{label}</p>
    </div>
  );
}
