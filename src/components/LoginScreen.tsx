'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface LoginScreenProps {
  devMailboxEnabled: boolean;
}

const DEMO_ACCOUNTS = [
  {
    email: 'secretaris@noorderster.loge',
    name: 'Br. Willem Vermeer',
    avatar: '/demo/usr-willem.jpg',
    lodgeLogo: '/demo/loge-noorderster.jpg',
    badge: 'Secretaris · Meester (3e graad)',
    detail: 'Lid van 2 loges (Haarlem & Studieloge Amersfoort) + Beheerrechten',
  },
  {
    email: 'gezel@noorderster.loge',
    name: 'Br. Thomas Bakker',
    avatar: '/demo/usr-thomas.jpg',
    lodgeLogo: '/demo/loge-noorderster.jpg',
    badge: 'Gezel (2e graad)',
    detail: 'Loge De Noorderster · Ziet 1e & 2e graad, géén Meesterarbeid',
  },
  {
    email: 'leerling@noorderster.loge',
    name: 'Br. Daan Meijer',
    avatar: '/demo/usr-daan.jpg',
    lodgeLogo: '/demo/loge-noorderster.jpg',
    badge: 'Leerling (1e graad)',
    detail: 'Loge De Noorderster · Ziet uitsluitend 1e-graads bijeenkomsten & stukken',
  },
  {
    email: 'secretaris@concordia.loge',
    name: 'Br. Karel van Dijk',
    avatar: '/demo/usr-karel.jpg',
    lodgeLogo: '/demo/loge-concordia.jpg',
    badge: 'Secretaris · Meester (3e graad)',
    detail: 'Zusterloge Concordia Nr. 18 (Utrecht) · Kan visiteren in Haarlem',
  },
];

function reloadPortalRoot() {
  if (window.location.pathname === '/' && !window.location.search) {
    window.location.reload();
  } else {
    window.location.replace('/');
  }
}

export default function LoginScreen({ devMailboxEnabled }: LoginScreenProps) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [devMagicUrl, setDevMagicUrl] = useState<string | null>(null);

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        devCode?: string;
        devMagicUrl?: string;
      };

      if (!res.ok || !data.ok) {
        setError(data.error || 'Versturen van de inlogcode is niet gelukt.');
        return;
      }

      setDevCode(data.devCode || null);
      setDevMagicUrl(data.devMagicUrl || null);
      setCode('');
      setStep('code');
    } catch {
      setError('Controleer uw internetverbinding en probeer het opnieuw.');
    } finally {
      setLoading(false);
    }
  }

  async function submitCodeVerification(codeToVerify: string) {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code: codeToVerify,
          keepSignedIn,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || 'Deze code is niet juist.');
        setLoading(false);
        return;
      }
      reloadPortalRoot();
    } catch {
      setError('Er ging iets mis bij het controleren van de code.');
      setLoading(false);
    }
  }

  async function handleQuickDemoLogin(demoEmail: string) {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demoEmail }),
      });
      if (res.ok) {
        reloadPortalRoot();
        return;
      }
      const data = (await res.json()) as { error?: string };
      setError(data.error || 'Snel inloggen mislukt.');
      setLoading(false);
    } catch {
      setError('Snel inloggen mislukt. Controleer uw verbinding.');
      setLoading(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 md:py-12">
      {/* Koptekst & Symbool */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#1B365D] shadow-md mb-4 border-2 border-[#D4AF37]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.svg"
            alt="Passer en Winkelhaak"
            className="w-16 h-16"
          />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-[#1B365D]">
          Mijn Werkplank
        </h1>
        <p className="text-slate-700 mt-2 text-lg max-w-lg mx-auto">
          Het rustige, veilige broederportaal voor werkplanken, broedermaal,
          ledenlijst en visiteren — zonder wachtwoorden.
        </p>
      </div>

      {/* Hoofd-inlogkaart */}
      <section className="bg-white rounded-2xl shadow-md border border-[#D6D0C4] p-6 md:p-8">
        {error && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-xl bg-red-50 border-2 border-red-600 text-red-950 font-medium"
          >
            {error}
          </div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleRequestCode} className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-[#1B365D] mb-2">
                Eenvoudig inloggen met uw e-mailadres
              </h2>
              <p className="text-slate-700">
                U hoeft <strong>geen wachtwoord</strong> te weten. Vul het
                e-mailadres in dat bij uw Secretaris bekend is; u ontvangt
                direct een e-mail met een duidelijke klikknop én een 6-cijferige
                code.
              </p>
            </div>

            <div>
              <label
                htmlFor="login-email"
                className="block font-bold text-slate-900 mb-2 text-lg"
              >
                Uw e-mailadres
              </label>
              <div className="relative">
                <Mail className="w-6 h-6 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="bijv. naam@voorbeeld.nl"
                  className="w-full pl-12 pr-4 py-4 text-lg rounded-xl border-2 border-slate-300 focus:border-[#1B365D] bg-white text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 rounded-xl bg-[#1B365D] hover:bg-[#132642] disabled:opacity-60 text-white font-bold text-lg inline-flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              <span>
                {loading
                  ? 'Bezig met versturen...'
                  : 'Stuur mijn inlogcode per e-mail'}
              </span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <div className="pt-3 border-t border-slate-200 flex items-start gap-3 text-sm text-slate-600">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <span>
                <strong>Discretie &amp; AVG:</strong> Alleen broeders die door de
                Secretaris van een aangesloten loge zijn uitgenodigd hebben
                toegang. Na inloggen blijft u 1 jaar ingelogd op uw eigen
                telefoon of computer.
              </span>
            </div>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitCodeVerification(code);
            }}
            className="space-y-5"
          >
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setError('');
              }}
              className="inline-flex items-center gap-1.5 text-[#1B365D] font-semibold hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Ander e-mailadres kiezen
            </button>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-500 text-emerald-950">
              <p className="font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                E-mail verzonden naar {email}
              </p>
              <p className="text-sm mt-1">
                Open uw e-mail: klik daar op de blauwe inlogknop,{' '}
                <strong>óf</strong> typ hieronder de grote 6 cijfers uit de mail
                over.
              </p>
            </div>

            {devCode && (
              <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-400 text-amber-950">
                <p className="font-bold text-sm uppercase tracking-wide text-amber-900">
                  Lokale Proefmodus (zonder echte mailserver)
                </p>
                <p className="mt-1 text-sm">
                  Uw zojuist aangemaakte 6-cijferige code is{' '}
                  <strong className="font-mono text-lg px-2 py-0.5 bg-white rounded border border-amber-300">
                    {devCode}
                  </strong>
                  . U kunt deze mail ook rechtsboven bekijken in het{' '}
                  <strong>Proef-postvak</strong>.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCode(devCode);
                      void submitCodeVerification(devCode);
                    }}
                    className="px-4 py-2 rounded-lg bg-amber-900 hover:bg-amber-950 text-white font-semibold text-sm cursor-pointer"
                  >
                    Code {devCode} invullen &amp; direct inloggen
                  </button>
                  {devMagicUrl && (
                    <a
                      href={devMagicUrl}
                      className="px-4 py-2 rounded-lg bg-white hover:bg-amber-100 text-amber-950 border border-amber-400 font-semibold text-sm"
                    >
                      Test de kliklink uit de e-mail →
                    </a>
                  )}
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="login-code"
                className="block font-bold text-slate-900 mb-2 text-lg"
              >
                6-cijferige code uit uw e-mail
              </label>
              <div className="relative">
                <KeyRound className="w-6 h-6 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setCode(digits);
                  }}
                  placeholder="123456"
                  className="w-full pl-12 pr-4 py-4 text-3xl font-mono font-bold tracking-[0.35em] text-center rounded-xl border-2 border-slate-300 focus:border-[#1B365D] bg-white text-[#1B365D]"
                />
              </div>
            </div>

            <label className="flex items-start gap-3 p-3 rounded-xl bg-[#FAF8F5] border border-[#D6D0C4] cursor-pointer">
              <input
                type="checkbox"
                checked={keepSignedIn}
                onChange={(e) => setKeepSignedIn(e.target.checked)}
                className="mt-1 w-5 h-5 accent-[#1B365D]"
              />
              <span className="text-slate-800 text-sm">
                <strong>Blijf 1 jaar ingelogd op dit apparaat</strong> (aanbevolen
                op uw eigen telefoon, tablet of thuiscomputer).
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full py-4 px-6 rounded-xl bg-[#1B365D] hover:bg-[#132642] disabled:opacity-50 text-white font-bold text-lg inline-flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              <span>{loading ? 'Bezig met inloggen...' : 'Nu inloggen'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        )}
      </section>

      {/* Snel testen van verschillende rollen en graden (alleen in lokale testmodus!) */}
      {devMailboxEnabled && (
        <section className="mt-8 bg-white rounded-2xl border-2 border-dashed border-[#B8860B]/60 p-6">
          <div className="flex items-center gap-2 text-[#1B365D] font-bold text-lg mb-1">
            <Sparkles className="w-5 h-5 text-[#B8860B]" />
            <h2>Snel meekijken per Graad of Rol (Testmodus)</h2>
          </div>
          <p className="text-slate-700 text-sm mb-4">
            Klik op een van de voorbeeld-broeders hieronder om direct met 1 klik
            te ervaren hoe de app werkt voor een <strong>Secretaris</strong>,{' '}
            <strong>Gezel</strong>, <strong>Leerling</strong> of een{' '}
            <strong>Zusterloge</strong>:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                disabled={loading}
                onClick={() => void handleQuickDemoLogin(acc.email)}
                className="text-left p-4 rounded-xl border border-slate-300 hover:border-[#1B365D] hover:bg-[#FAF8F5] transition flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={acc.avatar}
                      alt={acc.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-[#1B365D]/30 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 group-hover:text-[#1B365D] flex items-center gap-1.5">
                        <span className="truncate">{acc.name}</span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={acc.lodgeLogo}
                          alt=""
                          className="w-5 h-5 rounded object-cover shrink-0"
                        />
                      </div>
                      <div className="inline-block mt-1 px-2 py-0.5 rounded bg-[#1B365D]/10 text-[#1B365D] text-xs font-bold">
                        {acc.badge}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 mt-2.5">{acc.detail}</p>
                </div>
                <div className="mt-3 text-xs font-bold text-[#1B365D] flex items-center gap-1">
                  Open als {acc.name.replace('Br. ', '')} →
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
