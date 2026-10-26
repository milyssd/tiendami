'use client';
import { useRouter } from 'next/navigation';
import { useStore } from './store';
export function ProjectForms({ id }: { id: string }) {
  const r = useRouter();
  const s = useStore();
  async function send(e: React.FormEvent<HTMLFormElement>, action: string) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const response = await fetch(`/api/projects/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...Object.fromEntries(f) }),
    });
    const d = await response.json();
    if (!response.ok) {
      s.notify(d.error);
      return;
    }
    s.notify('Información guardada.');
    r.refresh();
    if (action === 'comment') form.reset();
  }
  return (
    <div className="form-grid">
      <section className="panel">
        <h2>HABLEMOS DE TU IDEA.</h2>
        <form className="form-stack" onSubmit={(e) => void send(e, 'brief')}>
          <label className="field-label">
            Tu negocio
            <input name="business" minLength={3} maxLength={500} required />
          </label>
          <label className="field-label">
            Sitios de referencia
            <textarea name="references" maxLength={1000} />
          </label>
          <label className="field-label">
            Colores y estilo
            <input name="colors" maxLength={300} />
          </label>
          <label className="field-label">
            Qué necesitas
            <textarea
              name="requirements"
              minLength={20}
              maxLength={5000}
              required
            />
          </label>
          <button className="button blue">Guardar brief ↗</button>
        </form>
      </section>
      <section className="panel">
        <h2>SIGAMOS CONVERSANDO.</h2>
        <form className="form-stack" onSubmit={(e) => void send(e, 'comment')}>
          <label className="field-label">
            Mensaje
            <textarea name="text" minLength={2} maxLength={3000} required />
          </label>
          <button className="button blue">Enviar mensaje ↗</button>
        </form>
      </section>
    </div>
  );
}
