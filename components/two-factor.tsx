'use client';
import { useState } from 'react';
import Image from 'next/image';
import { ShieldCheck } from 'lucide-react';
import { useStore } from './store';
export function TwoFactor({
  enabled,
  onEnabled,
}: {
  enabled: boolean;
  onEnabled: () => void;
}) {
  const s = useStore();
  const [setup, setSetup] = useState<{ qr: string; secret: string } | null>(
    null,
  );
  const [recovery, setRecovery] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  async function request(action: string, otp?: string) {
    setBusy(true);
    try {
      const r = await fetch('/api/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, otp }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      return d;
    } catch (e) {
      s.notify((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      style={{
        marginTop: 30,
        borderTop: '1px solid var(--line)',
        paddingTop: 25,
      }}
    >
      <h3 style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <ShieldCheck size={18} />
        Autenticación en dos pasos
      </h3>
      <p className="fine-print">
        {enabled
          ? 'Tu cuenta tiene segundo factor activo.'
          : 'Añade una capa de protección con una aplicación de autenticación. Es obligatorio para administrar la tienda.'}
      </p>
      {!enabled && !setup && (
        <button
          className="button blue"
          disabled={busy}
          onClick={async () => {
            const d = await request('setup');
            if (d) setSetup(d);
          }}
        >
          Configurar autenticador
        </button>
      )}
      {setup && !enabled && (
        <div>
          <Image
            src={setup.qr}
            width={210}
            height={210}
            alt="Código QR privado para tu aplicación de autenticación"
            unoptimized
          />
          <p className="fine-print">
            Escanea este QR con tu autenticador. No compartas la imagen ni esta
            clave.
          </p>
          <code className="revealed-code">{setup.secret}</code>
          <form
            className="form-stack"
            style={{ marginTop: 15, maxWidth: 300 }}
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const d = await request('enable', String(f.get('otp')));
              if (d) {
                setRecovery(d.recoveryCodes);
                setSetup(null);
                onEnabled();
              }
            }}
          >
            <label className="field-label">
              Código de 6 dígitos
              <input
                name="otp"
                inputMode="numeric"
                pattern="[0-9]{6}"
                autoComplete="one-time-code"
                required
              />
            </label>
            <button className="button blue" disabled={busy}>
              Activar segundo factor
            </button>
          </form>
        </div>
      )}
      {recovery.length > 0 && (
        <div className="form-success" style={{ marginTop: 20 }}>
          <strong>
            Guarda estos códigos de recuperación en un lugar seguro. Se muestran
            una sola vez y cada código sirve una sola vez.
          </strong>
          <pre style={{ whiteSpace: 'pre-wrap', lineHeight: 2 }}>
            {recovery.join('\n')}
          </pre>
          <button className="underlined-link" onClick={() => setRecovery([])}>
            Ya guardé mis códigos
          </button>
        </div>
      )}
    </section>
  );
}
