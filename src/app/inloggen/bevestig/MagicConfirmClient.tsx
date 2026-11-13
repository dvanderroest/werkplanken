'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

export default function MagicConfirmClient({ token }: { token: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'ok' | 'error'>(
    token ? 'verifying' : 'error'
  );
  const [errorMessage, setErrorMessage] = useState(
    token ? '' : 'Geen geldige inloglink gevonden.'
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function verify() {
      try {
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ magicToken: token }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (cancelled) return;

        if (!res.ok || !data.ok) {
          setStatus('error');
          setErrorMessage(
            data.error || 'Deze inloglink is verlopen of niet meer geldig.'
          );
          return;
        }

        setStatus('ok');
        setTimeout(() => {
          router.replace('/');
          router.refresh();
        }, 700);
      } catch {
        if (!cancelled) {
          setStatus('error');
          setErrorMessage('Inloggen is niet gelukt. Probeer het opnieuw.');
        }
      }
    }

    void verify();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <main className="max-w-lg mx-auto px-4 py-16">
      <div className="bg-white rounded-2xl shadow-md border border-[#D6D0C4] p-8 text-center">
        {status === 'verifying' && (
          <>
            <Loader2 className="w-12 h-12 text-[#1B365D] animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-[#1B365D]">
              U wordt nu ingelogd...
            </h1>
            <p className="text-slate-600 mt-2">Een klein ogenblik geduld.</p>
          </>
        )}

        {status === 'ok' && (
          <>
            <CheckCircle2 className="w-14 h-14 text-emerald-700 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-emerald-900">
              Welkom terug!
            </h1>
            <p className="text-slate-700 mt-2 mb-6">
              U bent ingelogd en wordt nu doorgestuurd naar Mijn Werkplank.
            </p>
            <Link
              href="/"
              className="inline-block py-3.5 px-6 rounded-xl bg-[#1B365D] text-white font-bold"
            >
              Open Mijn Werkplank →
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-14 h-14 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900">
              Link niet meer geldig
            </h1>
            <p className="text-slate-700 mt-2 mb-6">{errorMessage}</p>
            <Link
              href="/"
              className="inline-block py-3.5 px-6 rounded-xl bg-[#1B365D] text-white font-bold"
            >
              Nieuwe inlogcode aanvragen →
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
