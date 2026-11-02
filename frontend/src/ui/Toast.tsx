import { useToast } from '../toast';

export function Toast() {
  const toast = useToast();
  if (!toast) return null;
  return (
    <div key={toast.id} role="status" className={`toast toast-${toast.kind}`} data-testid="toast" data-kind={toast.kind}>
      {toast.message}
    </div>
  );
}
