'use client';

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Inbox,
  RefreshCw,
  Share,
  Smartphone,
  Type,
  X,
} from 'lucide-react';
import type { OutboxEmail } from '@/lib/types';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface AccessibilityBarProps {
  devMailboxEnabled: boolean;
}

type FontScale = 'normal' | 'large' | 'xlarge';

export default function AccessibilityBar({
  devMailboxEnabled,
}: AccessibilityBarProps) {
  const [fontScale, setFontScale] = useState<FontScale>('normal');
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installedDone, setInstalledDone] = useState(false);

  const [showMailbox, setShowMailbox] = useState(false);
  const [emails, setEmails] = useState<OutboxEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<OutboxEmail | null>(null);
  const [loadingMail, setLoadingMail] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(
      'werkplank_font_scale'
    ) as FontScale | null;
    if (saved === 'normal' || saved === 'large' || saved === 'xlarge') {
      setFontScale(saved);
      document.documentElement.setAttribute('data-font-scale', saved);
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((reg) => reg.update())
        .catch(() => {
          // Service worker registratie is optioneel tijdens ontwikkeling
        });
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    };
  }, []);

  function updateScale(next: FontScale) {
    setFontScale(next);
    window.localStorage.setItem('werkplank_font_scale', next);
    document.documentElement.setAttribute('data-font-scale', next);
  }

  async function loadMailbox() {
    if (!devMailboxEnabled) return;
    setLoadingMail(true);
    try {
      const res = await fetch('/api/dev-mailbox');
      const data = (await res.json()) as { emails?: OutboxEmail[] };
      const list = data.emails || [];
      setEmails(list);
      if (list.length > 0 && !selectedEmail) {
        setSelectedEmail(list[0]);
      }
    } finally {
      setLoadingMail(false);
    }
  }

  function openMailboxDrawer() {
    setShowMailbox(true);
    void loadMailbox();
  }

  async function triggerNativeInstall() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstalledDone(true);
      setInstallPrompt(null);
    }
  }

  return (
    <>
      <div className="no-print bg-[#132642] text-white border-b border-[#294670]">
        <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
          {/* Links: Tekstgrootte voor senioren */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-slate-200 font-medium">
              <Type className="w-4 h-4 text-[#F6E29C]" aria-hidden="true" />
              <span>Tekstgrootte:</span>
            </span>
            <div
              className="inline-flex rounded-lg bg-[#0C192C] p-0.5 border border-[#2D4B78]"
              role="group"
              aria-label="Kies tekstgrootte"
            >
              <button
                type="button"
                onClick={() => updateScale('normal')}
                className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                  fontScale === 'normal'
                    ? 'bg-[#F6E29C] text-[#0F172A]'
                    : 'text-white hover:bg-[#1E3A63]'
                }`}
                title="Normale letters"
              >
                A
              </button>
              <button
                type="button"
                onClick={() => updateScale('large')}
                className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                  fontScale === 'large'
                    ? 'bg-[#F6E29C] text-[#0F172A]'
                    : 'text-white hover:bg-[#1E3A63]'
                }`}
                title="Grote letters"
              >
                A+
              </button>
              <button
                type="button"
                onClick={() => updateScale('xlarge')}
                className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                  fontScale === 'xlarge'
                    ? 'bg-[#F6E29C] text-[#0F172A]'
                    : 'text-white hover:bg-[#1E3A63]'
                }`}
                title="Extra grote letters"
              >
                A++
              </button>
            </div>
          </div>

          {/* Rechts: Zet op telefoon (PWA) + Proef-postvak */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowInstallHelp(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E3A63] hover:bg-[#274B7E] text-white font-medium transition cursor-pointer border border-[#3B629B]"
            >
              <Smartphone className="w-4 h-4 text-[#F6E29C]" />
              <span>Zet als App op telefoon / pc</span>
            </button>

            {devMailboxEnabled && (
              <button
                type="button"
                onClick={openMailboxDrawer}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-300 hover:bg-amber-200 text-slate-950 font-semibold transition cursor-pointer"
              >
                <Inbox className="w-4 h-4" />
                <span>Proef-postvak</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Uitleg "Zet als App op telefoon of computer" zonder App Store */}
      {showInstallHelp && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-modal-title"
        >
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[#D6D0C4] max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h2
                id="pwa-modal-title"
                className="text-2xl font-bold text-[#1B365D]"
              >
                Als App op uw telefoon of pc zetten
              </h2>
              <button
                type="button"
                onClick={() => setShowInstallHelp(false)}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                aria-label="Sluiten"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-slate-700 mb-5">
              U heeft <strong>geen Apple App Store of Google Play wachtwoord</strong>{' '}
              nodig. U plaatst <em>Mijn Werkplank</em> met één handeling als
              icoontje op uw startscherm:
            </p>

            {installPrompt && !installedDone && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 border-2 border-emerald-600">
                <p className="font-semibold text-emerald-950 mb-3">
                  Uw browser ondersteunt directe installatie met 1 klik:
                </p>
                <button
                  type="button"
                  onClick={triggerNativeInstall}
                  className="w-full py-3.5 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-lg cursor-pointer"
                >
                  Nu direct als App installeren
                </button>
              </div>
            )}

            {installedDone && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-500 flex items-center gap-3 text-emerald-900 font-medium">
                <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-700" />
                <span>
                  Gelukt! Mijn Werkplank staat nu als app op uw apparaat.
                </span>
              </div>
            )}

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#D6D0C4]">
                <h3 className="font-bold text-lg text-[#1B365D] mb-1">
                  Op iPhone of iPad (Safari)
                </h3>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-800">
                  <li>
                    Tik onderaan (of rechtsboven op iPad) op het{' '}
                    <span className="inline-flex items-center gap-1 font-semibold text-[#1B365D]">
                      Deel-icoontje <Share className="w-4 h-4 inline" />
                    </span>{' '}
                    (vierkantje met pijltje omhoog).
                  </li>
                  <li>
                    Scroll iets omlaag en tik op{' '}
                    <strong>&ldquo;Zet op beginscherm&rdquo;</strong>.
                  </li>
                  <li>
                    Tik rechtsboven op <strong>&ldquo;Voeg toe&rdquo;</strong>.
                  </li>
                </ol>
              </div>

              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#D6D0C4]">
                <h3 className="font-bold text-lg text-[#1B365D] mb-1">
                  Op Android telefoon of tablet (Chrome)
                </h3>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-800">
                  <li>
                    Tik rechtsboven op de <strong>drie puntjes (⋮)</strong>.
                  </li>
                  <li>
                    Kies <strong>&ldquo;App installeren&rdquo;</strong> of{' '}
                    <strong>&ldquo;Toevoegen aan startscherm&rdquo;</strong>.
                  </li>
                </ol>
              </div>

              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#D6D0C4]">
                <h3 className="font-bold text-lg text-[#1B365D] mb-1">
                  Op Windows PC of Mac
                </h3>
                <p className="text-slate-800">
                  Klik rechts in de adresbalk van Edge of Chrome op het kleine
                  computer-icoontje (<strong>App installeren</strong>), of maak
                  een bladwijzer aan. U blijft een heel jaar automatisch
                  ingelogd.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowInstallHelp(false)}
              className="mt-6 w-full py-3 rounded-xl bg-[#1B365D] hover:bg-[#132642] text-white font-bold cursor-pointer"
            >
              Begrepen, sluit venster
            </button>
          </div>
        </div>
      )}

      {/* Drawer: Proef-postvak voor lokaal testen van inlogcodes en werkplank-mails */}
      {showMailbox && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Proef-postvak"
        >
          <div className="bg-white w-full max-w-3xl h-full flex flex-col shadow-2xl">
            <div className="p-4 bg-[#1B365D] text-white flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Inbox className="w-5 h-5 text-[#F6E29C]" />
                  Proef-postvak (Lokale Testmodus)
                </h2>
                <p className="text-sm text-slate-200">
                  Hier ziet u alle e-mails die de app verstuurt (inlogcodes én
                  werkplank-uitnodigingen met 1-klik knoppen).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void loadMailbox()}
                  className="px-3 py-2 rounded-lg bg-[#274B7E] hover:bg-[#325E9B] text-white text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loadingMail ? 'animate-spin' : ''}`}
                  />
                  Ververs
                </button>
                <button
                  type="button"
                  onClick={() => setShowMailbox(false)}
                  className="p-2 rounded-lg hover:bg-[#274B7E] cursor-pointer"
                  aria-label="Sluiten"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-5 overflow-hidden">
              <div className="md:col-span-2 border-b md:border-b-0 md:border-r border-slate-200 overflow-y-auto bg-slate-50">
                {emails.length === 0 ? (
                  <div className="p-6 text-slate-600 text-center">
                    Nog geen e-mails verstuurd in deze sessie. Vraag een
                    inlogcode aan of verstuur als Secretaris een werkplank-mail!
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-200">
                    {emails.map((mail) => (
                      <li key={mail.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedEmail(mail)}
                          className={`w-full text-left p-3.5 hover:bg-white transition cursor-pointer ${
                            selectedEmail?.id === mail.id
                              ? 'bg-white border-l-4 border-[#1B365D]'
                              : ''
                          }`}
                        >
                          <div className="text-xs text-slate-500 flex justify-between">
                            <span>Aan: {mail.toEmail}</span>
                          </div>
                          <div className="font-semibold text-slate-900 text-sm mt-0.5 line-clamp-2">
                            {mail.subject}
                          </div>
                          {mail.previewCode && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-950 text-xs font-mono font-bold rounded">
                              Code: {mail.previewCode}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="md:col-span-3 overflow-y-auto p-5 bg-white">
                {selectedEmail ? (
                  <div>
                    <div className="mb-4 pb-3 border-b border-slate-200">
                      <div className="text-sm text-slate-600">
                        <strong>Aan:</strong> {selectedEmail.toName} &lt;
                        {selectedEmail.toEmail}&gt;
                      </div>
                      <div className="text-lg font-bold text-slate-900 mt-1">
                        {selectedEmail.subject}
                      </div>
                    </div>
                    <div
                      className="prose max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: selectedEmail.htmlBody,
                      }}
                    />
                  </div>
                ) : (
                  <div className="text-slate-500 text-center py-12">
                    Selecteer links een e-mailbericht om de inhoud te bekijken.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
