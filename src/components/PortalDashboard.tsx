'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  Compass,
  Home,
  LogOut,
  Mail,
  MapPin,
  Megaphone,
  Phone,
  Pin,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { formatDutchDate } from '@/lib/format';
import {
  DEGREE_LABELS,
  DEGREE_SHORT_LABELS,
  type AuthenticatedUser,
  type Lodge,
  type LodgeAnnouncement,
  type LodgeDocument,
  type LodgeEvent,
  type LodgeMemberView,
} from '@/lib/types';
import EventCard from './EventCard';
import SecretaryPanel from './SecretaryPanel';

interface PortalDashboardProps {
  user: AuthenticatedUser;
  activeLodge: Lodge;
  canManage: boolean;
  ownEvents: LodgeEvent[];
  visitorEvents: LodgeEvent[];
  members: LodgeMemberView[];
  documents: LodgeDocument[];
  announcements: LodgeAnnouncement[];
}

type MainTab =
  | 'start'
  | 'werkplanken'
  | 'visiteren'
  | 'leden'
  | 'bouwstukken'
  | 'secretariaat';

export default function PortalDashboard({
  user,
  activeLodge,
  canManage,
  ownEvents,
  visitorEvents,
  members,
  documents,
  announcements,
}: PortalDashboardProps) {
  const router = useRouter();
  const [tab, setTab] = useState<MainTab>('start');
  const [switchingLodge, setSwitchingLodge] = useState(false);

  // Zoekfilters
  const [memberQuery, setMemberQuery] = useState('');
  const [visitorCityQuery, setVisitorCityQuery] = useState('');
  const [docQuery, setDocQuery] = useState('');
  const [readingDoc, setReadingDoc] = useState<LodgeDocument | null>(null);

  // Eigen profiel / standaard dieetwens modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profPhone, setProfPhone] = useState(user.phone);
  const [profCity, setProfCity] = useState(user.city);
  const [profDiet, setProfDiet] = useState(user.dietaryDefault);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const activeMembership = user.memberships.find(
    (m) => m.lodgeId === activeLodge.id
  );

  const nextOwnEvent = ownEvents[0] || null;

  const filteredVisitorEvents = useMemo(() => {
    const q = visitorCityQuery.trim().toLowerCase();
    if (!q) return visitorEvents;
    return visitorEvents.filter(
      (ev) =>
        ev.lodgeCity.toLowerCase().includes(q) ||
        ev.lodgeName.toLowerCase().includes(q) ||
        ev.title.toLowerCase().includes(q)
    );
  }, [visitorEvents, visitorCityQuery]);

  const filteredMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.fullName.toLowerCase().includes(q) ||
        (m.officerTitle || '').toLowerCase().includes(q) ||
        m.city.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
    );
  }, [members, memberQuery]);

  const officers = useMemo(
    () => filteredMembers.filter((m) => Boolean(m.officerTitle)),
    [filteredMembers]
  );
  const regularBrothers = useMemo(
    () => filteredMembers.filter((m) => !m.officerTitle),
    [filteredMembers]
  );

  const filteredDocs = useMemo(() => {
    const q = docQuery.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.author.toLowerCase().includes(q) ||
        d.summary.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q)
    );
  }, [documents, docQuery]);

  async function handleSwitchLodge(nextLodgeId: string) {
    if (nextLodgeId === activeLodge.id) return;
    setSwitchingLodge(true);
    try {
      const res = await fetch('/api/auth/switch-lodge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lodgeId: nextLodgeId }),
      });
      if (res.ok) {
        setTab('start');
        router.refresh();
      }
    } finally {
      setSwitchingLodge(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.refresh();
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSaved(false);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: profPhone,
          city: profCity,
          dietaryDefault: profDiet,
        }),
      });
      if (res.ok) {
        setProfileSaved(true);
        router.refresh();
      }
    } finally {
      setSavingProfile(false);
    }
  }

  const navItems: Array<{
    id: MainTab;
    label: string;
    mobileLabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'start', label: 'Start & Nieuws', mobileLabel: 'Start', icon: Home },
    {
      id: 'werkplanken',
      label: `Werkplanken (${ownEvents.length})`,
      mobileLabel: 'Agenda',
      icon: Calendar,
    },
    {
      id: 'visiteren',
      label: `Visiteren (${visitorEvents.length})`,
      mobileLabel: 'Visiteren',
      icon: Compass,
    },
    {
      id: 'leden',
      label: 'Wie is wie',
      mobileLabel: 'Leden',
      icon: Users,
    },
    {
      id: 'bouwstukken',
      label: 'Bouwstukken',
      mobileLabel: 'Stukken',
      icon: BookOpen,
    },
  ];

  if (canManage) {
    navItems.push({
      id: 'secretariaat',
      label: 'Secretariaat',
      mobileLabel: 'Beheer',
      icon: ShieldCheck,
    });
  }

  return (
    <div className="min-h-screen pb-24 md:pb-12">
      {/* Hoofdkop met Loge-identiteit, Loge-wisselaar en Ingelogde Broeder */}
      <header
        className="no-print text-white shadow-md"
        style={{ backgroundColor: activeLodge.accentColor || '#1B365D' }}
      >
        <div className="max-w-6xl mx-auto px-4 py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon.svg"
                alt="Symbool"
                className="w-14 h-14 rounded-xl border border-white/30 shrink-0"
              />
              <div>
                <div className="text-xs uppercase tracking-wider text-amber-200 font-bold">
                  Oosten {activeLodge.city} · {activeLodge.meetingDay}
                </div>
                <h1 className="text-2xl md:text-3xl font-bold leading-tight">
                  Loge {activeLodge.name}{' '}
                  <span className="whitespace-nowrap">
                    Nr. {activeLodge.number}
                  </span>
                </h1>

                {user.memberships.length > 1 && (
                  <div className="mt-2 inline-flex flex-wrap items-center gap-2 bg-black/20 px-3 py-1.5 rounded-xl border border-white/20">
                    <Building2 className="w-4 h-4 text-amber-200" />
                    <label
                      htmlFor="lodge-switcher"
                      className="text-xs font-semibold text-white/90"
                    >
                      Wissel tussen uw loges:
                    </label>
                    <select
                      id="lodge-switcher"
                      disabled={switchingLodge}
                      value={activeLodge.id}
                      onChange={(e) => void handleSwitchLodge(e.target.value)}
                      className="bg-white text-slate-900 font-bold text-sm rounded-lg px-2.5 py-1 cursor-pointer"
                    >
                      {user.memberships.map((m) => (
                        <option key={m.lodgeId} value={m.lodgeId}>
                          Loge {m.lodgeName} Nr. {m.lodgeNumber} ({m.lodgeCity})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Rechts: Profiel & Graad + Mijn gegevens + Uitloggen */}
            <div className="flex flex-wrap items-center gap-2.5 bg-black/20 p-3 rounded-xl border border-white/15">
              <div className="mr-2">
                <div className="font-bold text-base leading-snug">
                  {user.fullName}
                </div>
                <div className="text-xs text-amber-200 font-semibold flex flex-wrap items-center gap-1.5">
                  <span>{DEGREE_LABELS[user.degree]}</span>
                  {activeMembership?.officerTitle && (
                    <span>· {activeMembership.officerTitle}</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setProfileSaved(false);
                  setShowProfileModal(true);
                }}
                className="px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                title="Mijn gegevens en standaard dieetwens"
              >
                <Settings className="w-4 h-4" />
                <span>Mijn gegevens</span>
              </button>

              <button
                type="button"
                onClick={() => void handleLogout()}
                className="px-3 py-2 rounded-lg bg-white/15 hover:bg-red-700/80 text-white text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Uitloggen</span>
              </button>
            </div>
          </div>

          {/* Desktop Hoofdnavigatie */}
          <nav
            aria-label="Hoofdmenu"
            className="hidden md:flex flex-wrap gap-1.5 mt-5 pt-4 border-t border-white/20"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setReadingDoc(null);
                    setTab(item.id);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-sm lg:text-base font-bold inline-flex items-center gap-2 transition cursor-pointer ${
                    active
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-white hover:bg-white/15'
                  }`}
                >
                  <Icon className="w-4 h-4 lg:w-5 lg:h-5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Mobiele Vaste Onderbalk (ideaal voor duimbediening op smartphone!) */}
      <nav
        aria-label="Mobiel menu"
        className="no-print md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t-2 border-[#D6D0C4] shadow-lg"
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))`,
          }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setReadingDoc(null);
                  setTab(item.id);
                }}
                className={`py-2.5 px-1 flex flex-col items-center justify-center gap-0.5 text-xs font-bold cursor-pointer ${
                  active
                    ? 'text-[#1B365D] bg-[#1B365D]/10 border-t-2 border-[#1B365D]'
                    : 'text-slate-600'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="truncate max-w-full">{item.mobileLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Hoofdinhoud per gekozen onderdeel */}
      <main className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        {/* 1. START & MEDEDELINGEN */}
        {tab === 'start' && (
          <div className="space-y-8">
            {/* Eerstvolgende bijeenkomst van de eigen loge */}
            <section>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h2 className="text-2xl font-bold text-[#1B365D]">
                  Eerstvolgende Arbeid van uw Loge
                </h2>
                <button
                  type="button"
                  onClick={() => setTab('werkplanken')}
                  className="text-[#1B365D] font-bold hover:underline cursor-pointer"
                >
                  Bekijk volledige agenda ({ownEvents.length}) →
                </button>
              </div>

              {nextOwnEvent ? (
                <EventCard
                  event={nextOwnEvent}
                  defaultDietary={user.dietaryDefault}
                />
              ) : (
                <div className="bg-white rounded-2xl p-6 border border-[#D6D0C4] text-slate-700">
                  Er staan momenteel geen komende bijeenkomsten voor uw graad
                  ingepland.
                </div>
              )}
            </section>

            {/* Mededelingen van het Bestuur / Secretariaat / Lief en Leed */}
            <section>
              <h2 className="text-2xl font-bold text-[#1B365D] flex items-center gap-2 mb-3">
                <Megaphone className="w-6 h-6 text-[#B8860B]" />
                Mededelingen &amp; Lief en Leed (Loge {activeLodge.name})
              </h2>

              {announcements.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 border border-[#D6D0C4] text-slate-600">
                  Nog geen mededelingen geplaatst.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {announcements.map((ann) => (
                    <article
                      key={ann.id}
                      className={`bg-white rounded-2xl p-5 shadow-sm border ${
                        ann.isPinned
                          ? 'border-2 border-[#B8860B]'
                          : 'border-[#D6D0C4]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-[#1B365D]/10 text-[#1B365D] text-xs font-bold">
                          {ann.category}
                        </span>
                        {ann.isPinned && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#9A6E08]">
                            <Pin className="w-3.5 h-3.5" /> Vastgepind
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">
                        {ann.title}
                      </h3>
                      <p className="text-slate-800 whitespace-pre-line mb-3">
                        {ann.body}
                      </p>
                      <div className="text-xs text-slate-500 font-medium">
                        Geplaatst door {ann.authorName}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* Snelle tegels naar overige onderdelen */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setTab('visiteren')}
                className="p-5 rounded-2xl bg-white hover:bg-[#FAF8F5] border border-[#D6D0C4] text-left shadow-sm transition cursor-pointer"
              >
                <Compass className="w-7 h-7 text-[#1B365D] mb-2" />
                <div className="font-bold text-lg text-slate-900">
                  Visiteren bij andere Loges
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  Bekijk {visitorEvents.length} opengestelde avonden in het land
                  voor uw graad.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTab('leden')}
                className="p-5 rounded-2xl bg-white hover:bg-[#FAF8F5] border border-[#D6D0C4] text-left shadow-sm transition cursor-pointer"
              >
                <Users className="w-7 h-7 text-[#1B365D] mb-2" />
                <div className="font-bold text-lg text-slate-900">
                  Wie is wie ({members.length} broeders)
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  Officieren, telefoonnummers en e-mailadressen van uw eigen
                  loge.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTab('bouwstukken')}
                className="p-5 rounded-2xl bg-white hover:bg-[#FAF8F5] border border-[#D6D0C4] text-left shadow-sm transition cursor-pointer"
              >
                <BookOpen className="w-7 h-7 text-[#1B365D] mb-2" />
                <div className="font-bold text-lg text-slate-900">
                  Bouwstukken &amp; Stukken ({documents.length})
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  Rustig teruglezen op uw computer, tablet of telefoon.
                </p>
              </button>
            </section>
          </div>
        )}

        {/* 2. WERKPLANKEN & AGENDA (EIGEN LOGE) */}
        {tab === 'werkplanken' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-5 border border-[#D6D0C4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-[#1B365D]">
                  Werkplanken &amp; Arbeidstafel — Loge {activeLodge.name} Nr.{' '}
                  {activeLodge.number}
                </h2>
                <p className="text-slate-700 text-sm mt-1">
                  U ziet alle bijeenkomsten van uw loge tot en met uw eigen
                  graad (<strong>{DEGREE_LABELS[user.degree]}</strong>).
                </p>
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setTab('secretariaat')}
                  className="px-4 py-2.5 rounded-xl bg-[#1B365D] text-white font-bold text-sm shrink-0 cursor-pointer"
                >
                  Beheer &amp; Presentielijsten →
                </button>
              )}
            </div>

            {ownEvents.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-[#D6D0C4] text-center text-slate-600">
                Er zijn momenteel geen bijeenkomsten gevonden.
              </div>
            ) : (
              <div className="space-y-5">
                {ownEvents.map((ev, index) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    defaultDietary={user.dietaryDefault}
                    defaultExpanded={index === 0}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. LANDELIJKE ARBEIDSTAFEL & VISITEREN (ZUSTERLOGES) */}
        {tab === 'visiteren' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-[#D6D0C4] space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-[#1B365D] flex items-center gap-2">
                  <Compass className="w-7 h-7 text-[#B8860B]" />
                  Landelijke Arbeidstafel — Visiteren bij Zusterloges
                </h2>
                <p className="text-slate-700 mt-1">
                  Hieronder ziet u bijeenkomsten van andere aangesloten loges
                  die openstaan voor visiteurs én passen bij uw graad (
                  <strong>{DEGREE_LABELS[user.degree]}</strong>). Wanneer u zich
                  aanmeldt, geeft de app automatisch uw naam, moederloge (
                  <em>
                    Loge {user.primaryLodgeName} Nr. {user.primaryLodgeNumber}
                  </em>
                  ) en geverifieerde graad door aan de ontvangende Secretaris.
                </p>
              </div>

              <div className="relative max-w-md">
                <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={visitorCityQuery}
                  onChange={(e) => setVisitorCityQuery(e.target.value)}
                  placeholder="Zoek op stad (Oosten), logenaam of onderwerp..."
                  className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-slate-300 bg-white"
                />
              </div>
            </div>

            {filteredVisitorEvents.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-[#D6D0C4] text-center text-slate-600">
                Geen bijeenkomsten van andere loges gevonden voor deze
                zoekopdracht.
              </div>
            ) : (
              <div className="space-y-5">
                {filteredVisitorEvents.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    isVisitorMode
                    defaultDietary={user.dietaryDefault}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. LEDENLIJST "WIE IS WIE" (ALLEEN EIGEN LOGE - AVG BESCHERMD) */}
        {tab === 'leden' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-[#D6D0C4] space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-[#1B365D]">
                    Wie is wie — Broederlijst Loge {activeLodge.name} Nr.{' '}
                    {activeLodge.number}
                  </h2>
                  <p className="text-slate-700 text-sm mt-1">
                    Uit oogpunt van broederlijke discretie en de AVG is deze
                    ledenlijst <strong>uitsluitend zichtbaar</strong> voor leden
                    van Loge {activeLodge.name}.
                  </p>
                </div>

                <div className="relative w-full md:w-80">
                  <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={memberQuery}
                    onChange={(e) => setMemberQuery(e.target.value)}
                    placeholder="Zoek op naam, functie of plaats..."
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Officieren / Bestuur */}
            {officers.length > 0 && (
              <section>
                <h3 className="text-xl font-bold text-[#1B365D] mb-3">
                  Bestuur &amp; Officieren
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {officers.map((m) => (
                    <MemberCard key={m.userId} member={m} highlightOfficer />
                  ))}
                </div>
              </section>
            )}

            {/* Overige Broeders */}
            <section>
              <h3 className="text-xl font-bold text-[#1B365D] mb-3">
                Broeders ({regularBrothers.length})
              </h3>
              {regularBrothers.length === 0 ? (
                <p className="text-slate-600">Geen broeders gevonden.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {regularBrothers.map((m) => (
                    <MemberCard key={m.userId} member={m} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* 5. BOUWSTUKKEN & DOCUMENTEN (ALLEEN EIGEN LOGE + OP GRAAD) */}
        {tab === 'bouwstukken' && (
          <div className="space-y-6">
            {readingDoc ? (
              <article className="bg-white rounded-2xl shadow-md border border-[#D6D0C4] p-6 md:p-10 max-w-3xl mx-auto">
                <button
                  type="button"
                  onClick={() => setReadingDoc(null)}
                  className="mb-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FAF8F5] hover:bg-slate-100 border border-[#D6D0C4] text-[#1B365D] font-bold cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Terug naar overzicht Bouwstukken
                </button>

                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded bg-[#1B365D]/10 text-[#1B365D] text-xs font-bold">
                    {readingDoc.category}
                  </span>
                  <span className="px-2.5 py-0.5 rounded bg-amber-100 text-amber-950 text-xs font-bold">
                    {DEGREE_SHORT_LABELS[readingDoc.minDegree]}
                  </span>
                  <span className="text-sm text-slate-500">
                    {formatDutchDate(readingDoc.publishedDate)}
                  </span>
                </div>

                <h2 className="text-2xl md:text-3xl font-bold text-[#1B365D] mb-2">
                  {readingDoc.title}
                </h2>
                <p className="text-slate-700 font-semibold mb-6 pb-4 border-b border-slate-200">
                  Door {readingDoc.author}
                </p>

                <div className="text-slate-900 text-lg leading-relaxed whitespace-pre-line font-serif-dignified">
                  {readingDoc.content}
                </div>
              </article>
            ) : (
              <>
                <div className="bg-white rounded-2xl p-6 border border-[#D6D0C4] flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-[#1B365D]">
                      Bouwstukken &amp; Documenten — Loge {activeLodge.name}
                    </h2>
                    <p className="text-slate-700 text-sm mt-1">
                      Beveiligd op uw graad (
                      <strong>{DEGREE_LABELS[user.degree]}</strong>). Klik op
                      een stuk om het rustig in de leesweergave te openen.
                    </p>
                  </div>

                  <div className="relative w-full md:w-80">
                    <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={docQuery}
                      onChange={(e) => setDocQuery(e.target.value)}
                      placeholder="Zoek op onderwerp of spreker..."
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white"
                    />
                  </div>
                </div>

                {filteredDocs.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 border border-[#D6D0C4] text-center text-slate-600">
                    Geen bouwstukken gevonden.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredDocs.map((doc) => (
                      <article
                        key={doc.id}
                        className="bg-white rounded-2xl p-6 shadow-sm border border-[#D6D0C4] flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="px-2.5 py-0.5 rounded bg-[#1B365D]/10 text-[#1B365D] text-xs font-bold">
                              {doc.category}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-amber-100 text-amber-950 text-xs font-bold">
                              <Shield className="w-3.5 h-3.5" />
                              {DEGREE_SHORT_LABELS[doc.minDegree]}
                            </span>
                          </div>

                          <h3 className="text-xl font-bold text-slate-900 mb-1">
                            {doc.title}
                          </h3>
                          <div className="text-sm font-semibold text-[#1B365D] mb-2">
                            {doc.author} · {formatDutchDate(doc.publishedDate)}
                          </div>
                          <p className="text-slate-700 text-sm mb-4">
                            {doc.summary}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setReadingDoc(doc)}
                          className="w-full py-3 px-4 rounded-xl bg-[#FAF8F5] hover:bg-[#1B365D] hover:text-white border border-[#1B365D] text-[#1B365D] font-bold transition cursor-pointer"
                        >
                          Bouwstuk rustig lezen →
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 6. SECRETARIAAT & BEHEER */}
        {tab === 'secretariaat' && canManage && (
          <SecretaryPanel
            lodge={activeLodge}
            events={ownEvents}
            members={members}
          />
        )}
      </main>

      {/* Modal: Mijn eigen contactgegevens & standaard dieetwens */}
      {showProfileModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-modal-title"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#D6D0C4]">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2
                  id="profile-modal-title"
                  className="text-2xl font-bold text-[#1B365D]"
                >
                  Mijn gegevens &amp; dieetwens
                </h2>
                <p className="text-sm text-slate-600">
                  {user.fullName} · {user.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                aria-label="Sluiten"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {profileSaved && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-500 text-emerald-950 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                <span>Uw gegevens zijn opgeslagen!</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Telefoonnummer (zichtbaar voor eigen logebroeders)
                </label>
                <input
                  type="tel"
                  value={profPhone}
                  onChange={(e) => setProfPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Woonplaats
                </label>
                <input
                  type="text"
                  value={profCity}
                  onChange={(e) => setProfCity(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Standaard dieetwens voor het Broedermaal
                </label>
                <input
                  type="text"
                  value={profDiet}
                  onChange={(e) => setProfDiet(e.target.value)}
                  placeholder="Bijv. vegetarisch, glutenvrij, geen varkensvlees..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Wordt automatisch voor u ingevuld bij elke aanmelding voor een
                  maaltijd (ook als u visiteert!).
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-3 rounded-xl border border-slate-300 font-semibold text-slate-700 cursor-pointer"
                >
                  Sluiten
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-3 rounded-xl bg-[#1B365D] hover:bg-[#132642] text-white font-bold cursor-pointer"
                >
                  {savingProfile ? 'Opslaan...' : 'Gegevens opslaan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MemberCard({
  member,
  highlightOfficer = false,
}: {
  member: LodgeMemberView;
  highlightOfficer?: boolean;
}) {
  const initials = member.fullName
    .replace(/^Br\.\s*/i, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  return (
    <div
      className={`bg-white rounded-2xl p-5 shadow-sm border flex flex-col justify-between gap-4 ${
        highlightOfficer
          ? 'border-2 border-[#1B365D]/40'
          : 'border-[#D6D0C4]'
      }`}
    >
      <div className="flex items-start gap-3.5">
        <div className="w-12 h-12 rounded-full bg-[#1B365D] text-[#F6E29C] font-bold flex items-center justify-center text-lg shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          {member.officerTitle && (
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#1B365D] text-white text-xs font-bold mb-1">
              <UserCheck className="w-3.5 h-3.5 text-[#F6E29C]" />
              {member.officerTitle}
            </div>
          )}
          <h4 className="text-lg font-bold text-slate-900">{member.fullName}</h4>
          <div className="text-sm text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
            <span className="font-semibold text-[#1B365D]">
              {DEGREE_SHORT_LABELS[member.degree]}
            </span>
            {member.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {member.city}
              </span>
            )}
            {member.joinedYear && <span>Lid sinds {member.joinedYear}</span>}
          </div>
        </div>
      </div>

      {/* Grote, makkelijke Bel- en E-mailknoppen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-slate-100">
        {member.phone ? (
          <a
            href={`tel:${member.phone.replace(/\s+/g, '')}`}
            className="py-2.5 px-3 rounded-xl bg-[#FAF8F5] hover:bg-[#1B365D] hover:text-white border border-slate-300 text-slate-900 font-bold text-sm inline-flex items-center justify-center gap-2 transition"
          >
            <Phone className="w-4 h-4" />
            <span>Bel {member.phone}</span>
          </a>
        ) : (
          <div className="py-2.5 px-3 rounded-xl bg-slate-50 text-slate-400 text-sm text-center">
            Geen telefoon bekend
          </div>
        )}

        <a
          href={`mailto:${member.email}`}
          className="py-2.5 px-3 rounded-xl bg-[#FAF8F5] hover:bg-[#1B365D] hover:text-white border border-slate-300 text-slate-900 font-bold text-sm inline-flex items-center justify-center gap-2 transition truncate"
        >
          <Mail className="w-4 h-4 shrink-0" />
          <span className="truncate">Stuur e-mail</span>
        </a>
      </div>
    </div>
  );
}
