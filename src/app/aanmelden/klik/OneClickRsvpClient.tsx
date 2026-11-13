'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

export default function OneClickRsvpClient({
  token,
  choice,
}: {
  token: string;
  choice: string;
}) {
  const [state, setState] = useState<'saving' | 'ok' | 'error'>(
    token ? 'saving' : 'error'
  );
  const [eventTitle, setEventTitle] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState(
    token ? '' : 'Ongeldige aanmeldlink.'
  );

  const isDeclined = choice === 'verhinderd';
  const joinsMeal = choice === 'maal';

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function save() {
      try {
        const res = await fetch('/api/rsvp/one-click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            status: isDeclined ? 'declined' : 'attending',
            joinsMeal,
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          fullName?: string;
          eventTitle?: string;
          error?: string;
        };
        if (cancelled) return;

        if (!res.ok || !data.ok) {
          setState('error');
          setErrorMsg(data.error || 'Aanmelding kon niet worden opgeslagen.');
          return;
        }

        setFullName(data.fullName || '');
        setEventTitle(data.eventTitle || '');
        setState('ok');
      } catch {
        if (!cancelled) {
          setState('error');
          setErrorMsg('Controleer uw verbinding en probeer het opnieuw.');
        }
      }
    }

    void save();
    return () => {
      cancelled = true;
    };
  }, [token, isDeclined, joinsMeal]);

  return (
    <main className="max-w-xl mx-auto px-4 py-14">
      <div className="bg-white rounded-2xl shadow-md border border-[#D6D0C4] p-8 text-center">
        {state === 'saving' && (
          <>
            <Loader2 className="w-12 h-12 text-[#1B365D] animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-[#1B365D]">
              Uw keuze wordt doorgegeven...
            </h1>
          </>
        )}

        {state === 'ok' && (
          <>
            <CheckCircle2 className="w-16 h-16 text-emerald-700 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-emerald-950">
              Hartelijk dank{fullName ? `, ${fullName}` : ''}!
            </h1>
            <p className="text-lg text-slate-800 mt-3">
              Voor <strong>{eventTitle}</strong> staat u nu genoteerd als:{' '}
              <strong>
                {isDeclined
                  ? 'Verhinderd (afgemeld)'
                  : joinsMeal
                    ? 'Aanwezig + Broedermaal'
                    : 'Aanwezig (zonder maaltijd)'}
              </strong>
              .
            </p>
            <p className="text-sm text-slate-600 mt-2 mb-6">
              De Secretaris en de Hofmeester zien dit direct op hun lijst. U
              kunt uw keuze altijd nog wijzigen in de app.
            </p>
            <Link
              href="/"
              className="inline-block py-4 px-8 rounded-xl bg-[#1B365D] hover:bg-[#132642] text-white font-bold text-lg"
            >
              Bekijk de Werkplank in de App →
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <XCircle className="w-14 h-14 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900">
              Link kon niet worden verwerkt
            </h1>
            <p className="text-slate-700 mt-2 mb-6">{errorMsg}</p>
            <Link
              href="/"
              className="inline-block py-3.5 px-6 rounded-xl bg-[#1B365D] text-white font-bold"
            >
              Ga naar Mijn Werkplank →
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
