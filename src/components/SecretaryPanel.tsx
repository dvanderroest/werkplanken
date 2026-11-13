'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Building2,
  CalendarPlus,
  Camera,
  CheckCircle2,
  ClipboardList,
  Mail,
  Megaphone,
  Printer,
  Trash2,
  UserPlus,
  Users,
  Utensils,
} from 'lucide-react';
import { formatDutchDate } from '@/lib/format';
import { resizeImageFileToDataUrl } from '@/lib/imageClient';
import {
  DEGREE_LABELS,
  DEGREE_SHORT_LABELS,
  type Degree,
  type EventRsvpDetail,
  type Lodge,
  type LodgeEvent,
  type LodgeMemberView,
  type LodgeRole,
} from '@/lib/types';

interface SecretaryPanelProps {
  lodge: Lodge;
  events: LodgeEvent[];
  members: LodgeMemberView[];
}

type SubTab = 'attendance' | 'new-event' | 'members' | 'publish' | 'new-lodge';

export default function SecretaryPanel({
  lodge,
  events,
  members,
}: SecretaryPanelProps) {
  const router = useRouter();
  const [subTab, setSubTab] = useState<SubTab>('attendance');

  // State voor Aanwezigheid & Broedermaal
  const [selectedEventId, setSelectedEventId] = useState<string>(
    events[0]?.id || ''
  );
  const [rsvps, setRsvps] = useState<EventRsvpDetail[]>([]);
  const [loadingRsvps, setLoadingRsvps] = useState(false);
  const [sendingInvites, setSendingInvites] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // State voor Nieuwe Werkplank
  const [evTitle, setEvTitle] = useState('');
  const [evType, setEvType] = useState('Comparitie');
  const [evMinDegree, setEvMinDegree] = useState<Degree>(1);
  const [evDate, setEvDate] = useState('');
  const [evStartTime, setEvStartTime] = useState('20:00');
  const [evDoorsOpen, setEvDoorsOpen] = useState('19:30');
  const [evLocation, setEvLocation] = useState(lodge.address);
  const [evSpeaker, setEvSpeaker] = useState('');
  const [evHasMeal, setEvHasMeal] = useState(true);
  const [evMealInfo, setEvMealInfo] = useState(
    'Broedermaal om 18:30 uur (€ 15,00 p.p.)'
  );
  const [evAllowVisitors, setEvAllowVisitors] = useState(true);
  const [evText, setEvText] = useState('');
  const [savingForm, setSavingForm] = useState(false);

  // State voor Nieuwe Broeder toevoegen
  const [memName, setMemName] = useState('');
  const [memEmail, setMemEmail] = useState('');
  const [memPhone, setMemPhone] = useState('');
  const [memCity, setMemCity] = useState('');
  const [memDegree, setMemDegree] = useState<Degree>(1);
  const [memRole, setMemRole] = useState<LodgeRole>('member');
  const [memOfficer, setMemOfficer] = useState('');

  // State voor Mededeling & Bouwstuk
  const [annTitle, setAnnTitle] = useState('');
  const [annCategory, setAnnCategory] = useState('Secretariaat');
  const [annBody, setAnnBody] = useState('');
  const [annPinned, setAnnPinned] = useState(false);

  const [docTitle, setDocTitle] = useState('');
  const [docAuthor, setDocAuthor] = useState('');
  const [docCategory, setDocCategory] = useState('Bouwstuk');
  const [docDegree, setDocDegree] = useState<Degree>(1);
  const [docSummary, setDocSummary] = useState('');
  const [docContent, setDocContent] = useState('');

  // State voor Huidige Loge foto/kleur & Nieuwe Loge aansluiten
  const [curLodgeLogo, setCurLodgeLogo] = useState(lodge.logoUrl || '');
  const [curLodgeColor, setCurLodgeColor] = useState(
    lodge.accentColor || '#1B365D'
  );

  const [nlNumber, setNlNumber] = useState('');
  const [nlName, setNlName] = useState('');
  const [nlCity, setNlCity] = useState('');
  const [nlMeetingDay, setNlMeetingDay] = useState('Woensdagavond (aanvang 20:00 uur)');
  const [nlAddress, setNlAddress] = useState('');
  const [nlColor, setNlColor] = useState('#1B365D');
  const [nlLogo, setNlLogo] = useState('');

  useEffect(() => {
    setEvLocation(lodge.address);
    setCurLodgeLogo(lodge.logoUrl || '');
    setCurLodgeColor(lodge.accentColor || '#1B365D');
  }, [lodge.address, lodge.logoUrl, lodge.accentColor]);

  useEffect(() => {
    if (!events.some((e) => e.id === selectedEventId)) {
      setSelectedEventId(events[0]?.id || '');
    }
  }, [events, selectedEventId]);

  useEffect(() => {
    if (!selectedEventId) {
      setRsvps([]);
      return;
    }
    let cancelled = false;
    setLoadingRsvps(true);
    fetch(`/api/manage/events/${selectedEventId}/rsvps`)
      .then((res) => res.json())
      .then((data: { rsvps?: EventRsvpDetail[] }) => {
        if (!cancelled) {
          setRsvps(data.rsvps || []);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingRsvps(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedEventId, events]);

  const selectedEvent = events.find((e) => e.id === selectedEventId) || null;
  const attendingList = rsvps.filter((r) => r.status === 'attending');
  const declinedList = rsvps.filter((r) => r.status === 'declined');
  const visitorCount = attendingList.filter((r) => r.isVisitor).length;
  const mealList = attendingList.filter((r) => r.joinsMeal);

  function clearAlerts() {
    setFeedback('');
    setErrorMsg('');
  }

  async function handleSendEmailInvites() {
    if (!selectedEventId) return;
    clearAlerts();
    setSendingInvites(true);
    try {
      const res = await fetch('/api/manage/events/send-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: selectedEventId }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        sentCount?: number;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'Verzenden mislukt.');
        return;
      }
      setFeedback(
        `Werkplank-uitnodiging met directe 1-klik aanmeldknoppen is verstuurd naar ${data.sentCount} broeders (gefilterd op vereiste graad)! U kunt de mails direct bekijken in het Proef-postvak rechtsboven.`
      );
    } finally {
      setSendingInvites(false);
    }
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    clearAlerts();
    setSavingForm(true);
    try {
      const res = await fetch('/api/manage/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lodgeId: lodge.id,
          title: evTitle,
          eventType: evType,
          minDegree: evMinDegree,
          eventDate: evDate,
          startTime: evStartTime,
          doorsOpenTime: evDoorsOpen,
          location: evLocation,
          speaker: evSpeaker,
          hasMeal: evHasMeal,
          mealInfo: evMealInfo,
          allowVisitors: evAllowVisitors,
          werkplankText: evText,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        eventId?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'Opslaan van werkplank mislukt.');
        return;
      }
      setEvTitle('');
      setEvSpeaker('');
      setEvText('');
      setFeedback(
        'De nieuwe Werkplank staat op de agenda! Broeders met de juiste graad zien hem direct.'
      );
      if (data.eventId) setSelectedEventId(data.eventId);
      setSubTab('attendance');
      router.refresh();
    } finally {
      setSavingForm(false);
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    clearAlerts();
    setSavingForm(true);
    try {
      const res = await fetch('/api/manage/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          lodgeId: lodge.id,
          fullName: memName,
          email: memEmail,
          phone: memPhone,
          city: memCity,
          degree: memDegree,
          role: memRole,
          officerTitle: memOfficer,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'Toevoegen van broeder mislukt.');
        return;
      }
      setMemName('');
      setMemEmail('');
      setMemPhone('');
      setMemCity('');
      setMemOfficer('');
      setFeedback(
        'Broeder is toegevoegd aan de loge! Hij kan nu direct zonder wachtwoord inloggen met zijn e-mailadres.'
      );
      router.refresh();
    } finally {
      setSavingForm(false);
    }
  }

  async function handleUpdateMember(
    member: LodgeMemberView,
    nextDegree: Degree,
    nextRole: LodgeRole,
    nextOfficer: string
  ) {
    clearAlerts();
    const res = await fetch('/api/manage/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update',
        lodgeId: lodge.id,
        userId: member.userId,
        degree: nextDegree,
        role: nextRole,
        officerTitle: nextOfficer,
      }),
    });
    if (res.ok) {
      setFeedback(`Gegevens van ${member.fullName} zijn bijgewerkt.`);
      router.refresh();
    } else {
      setErrorMsg('Bijwerken mislukt.');
    }
  }

  async function handlePostAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    clearAlerts();
    setSavingForm(true);
    try {
      const res = await fetch('/api/manage/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lodgeId: lodge.id,
          title: annTitle,
          category: annCategory,
          body: annBody,
          isPinned: annPinned,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'Plaatsen mislukt.');
        return;
      }
      setAnnTitle('');
      setAnnBody('');
      setAnnPinned(false);
      setFeedback('Mededeling is geplaatst op het startscherm van uw loge.');
      router.refresh();
    } finally {
      setSavingForm(false);
    }
  }

  async function handlePostDocument(e: React.FormEvent) {
    e.preventDefault();
    clearAlerts();
    setSavingForm(true);
    try {
      const res = await fetch('/api/manage/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lodgeId: lodge.id,
          title: docTitle,
          author: docAuthor,
          category: docCategory,
          minDegree: docDegree,
          summary: docSummary,
          content: docContent,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'Plaatsen van bouwstuk mislukt.');
        return;
      }
      setDocTitle('');
      setDocAuthor('');
      setDocSummary('');
      setDocContent('');
      setFeedback(
        'Bouwstuk is opgeslagen in het archief (alleen zichtbaar vanaf de gekozen graad).'
      );
      router.refresh();
    } finally {
      setSavingForm(false);
    }
  }

  async function handleSelectLodgeImage(
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'current' | 'new'
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    clearAlerts();
    try {
      const dataUrl = await resizeImageFileToDataUrl(file, {
        maxSize: 256,
        cropSquare: false,
        preserveAlpha: true,
      });
      if (target === 'current') {
        setCurLodgeLogo(dataUrl);
      } else {
        setNlLogo(dataUrl);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Afbeelding kon niet worden verwerkt.'
      );
    } finally {
      e.target.value = '';
    }
  }

  async function handleUpdateCurrentLodge(e: React.FormEvent) {
    e.preventDefault();
    clearAlerts();
    setSavingForm(true);
    try {
      const res = await fetch('/api/manage/lodges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          lodgeId: lodge.id,
          logoUrl: curLodgeLogo,
          accentColor: curLodgeColor,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'Opslaan van loge-instellingen mislukt.');
        return;
      }
      setFeedback(
        `De foto en kleur van Loge ${lodge.name} Nr. ${lodge.number} zijn bijgewerkt!`
      );
      router.refresh();
    } finally {
      setSavingForm(false);
    }
  }

  async function handleCreateLodge(e: React.FormEvent) {
    e.preventDefault();
    clearAlerts();
    setSavingForm(true);
    try {
      const res = await fetch('/api/manage/lodges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          number: Number(nlNumber),
          name: nlName,
          city: nlCity,
          meetingDay: nlMeetingDay,
          address: nlAddress,
          accentColor: nlColor,
          logoUrl: nlLogo,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'Aanmaken van loge mislukt.');
        setSavingForm(false);
        return;
      }
      setNlNumber('');
      setNlName('');
      setNlCity('');
      setNlAddress('');
      setNlLogo('');
      window.location.reload();
      return;
    } catch {
      setErrorMsg('Aanmaken van loge mislukt.');
      setSavingForm(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Sub-navigatie voor Secretariaat & Hofmeester */}
      <div className="no-print bg-white rounded-2xl p-3 shadow-sm border border-[#D6D0C4] flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            clearAlerts();
            setSubTab('attendance');
          }}
          className={`px-4 py-2.5 rounded-xl font-bold inline-flex items-center gap-2 cursor-pointer transition ${
            subTab === 'attendance'
              ? 'bg-[#1B365D] text-white'
              : 'bg-[#FAF8F5] text-slate-800 hover:bg-slate-100'
          }`}
        >
          <ClipboardList className="w-5 h-5" />
          <span>Aanwezigheid &amp; Broedermaal</span>
        </button>

        <button
          type="button"
          onClick={() => {
            clearAlerts();
            setSubTab('new-event');
          }}
          className={`px-4 py-2.5 rounded-xl font-bold inline-flex items-center gap-2 cursor-pointer transition ${
            subTab === 'new-event'
              ? 'bg-[#1B365D] text-white'
              : 'bg-[#FAF8F5] text-slate-800 hover:bg-slate-100'
          }`}
        >
          <CalendarPlus className="w-5 h-5" />
          <span>Nieuwe Werkplank</span>
        </button>

        <button
          type="button"
          onClick={() => {
            clearAlerts();
            setSubTab('members');
          }}
          className={`px-4 py-2.5 rounded-xl font-bold inline-flex items-center gap-2 cursor-pointer transition ${
            subTab === 'members'
              ? 'bg-[#1B365D] text-white'
              : 'bg-[#FAF8F5] text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Users className="w-5 h-5" />
          <span>Broeders &amp; Graden ({members.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            clearAlerts();
            setSubTab('publish');
          }}
          className={`px-4 py-2.5 rounded-xl font-bold inline-flex items-center gap-2 cursor-pointer transition ${
            subTab === 'publish'
              ? 'bg-[#1B365D] text-white'
              : 'bg-[#FAF8F5] text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Megaphone className="w-5 h-5" />
          <span>Mededeling / Bouwstuk</span>
        </button>

        <button
          type="button"
          onClick={() => {
            clearAlerts();
            setSubTab('new-lodge');
          }}
          className={`px-4 py-2.5 rounded-xl font-bold inline-flex items-center gap-2 cursor-pointer transition ${
            subTab === 'new-lodge'
              ? 'bg-[#1B365D] text-white'
              : 'bg-[#FAF8F5] text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-5 h-5" />
          <span>Loge-foto &amp; Nieuwe Loge</span>
        </button>
      </div>

      {feedback && (
        <div
          role="status"
          className="no-print p-4 rounded-xl bg-emerald-50 border-2 border-emerald-600 text-emerald-950 font-semibold flex items-start gap-2.5"
        >
          <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
          <span>{feedback}</span>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="no-print p-4 rounded-xl bg-red-50 border-2 border-red-600 text-red-950 font-semibold"
        >
          {errorMsg}
        </div>
      )}

      {/* TAB 1: Aanwezigheidslijst, Visiteurs & Hofmeester-overzicht */}
      {subTab === 'attendance' && (
        <section className="print-card bg-white rounded-2xl shadow-sm border border-[#D6D0C4] p-6 space-y-6">
          <div className="no-print flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex-1">
              <label
                htmlFor="select-event"
                className="block font-bold text-slate-900 mb-1.5"
              >
                Kies bijeenkomst van Loge {lodge.name} Nr. {lodge.number}:
              </label>
              <select
                id="select-event"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 font-semibold"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {formatDutchDate(ev.eventDate)} — {ev.title} (
                    {DEGREE_SHORT_LABELS[ev.minDegree]})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!selectedEvent || sendingInvites}
                onClick={() => void handleSendEmailInvites()}
                className="px-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold inline-flex items-center gap-2 cursor-pointer"
              >
                <Mail className="w-5 h-5" />
                <span>
                  {sendingInvites
                    ? 'Bezig met mailen...'
                    : 'Mail Werkplank naar leden'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-3 rounded-xl bg-[#1B365D] hover:bg-[#132642] text-white font-bold inline-flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-5 h-5" />
                <span>Lijst afdrukken</span>
              </button>
            </div>
          </div>

          {selectedEvent && (
            <>
              <div className="pb-4 border-b border-slate-200">
                <h2 className="text-2xl font-bold text-[#1B365D]">
                  Presentie- &amp; Broedermaallijst: {selectedEvent.title}
                </h2>
                <p className="text-slate-700">
                  Loge {lodge.name} Nr. {lodge.number} ({lodge.city}) ·{' '}
                  {formatDutchDate(selectedEvent.eventDate)} om{' '}
                  {selectedEvent.startTime} uur ·{' '}
                  {DEGREE_LABELS[selectedEvent.minDegree]}
                </p>
              </div>

              {/* Samenvattende tellers */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#D6D0C4]">
                  <div className="text-sm text-slate-600">Totaal Aanwezig</div>
                  <div className="text-3xl font-bold text-[#1B365D]">
                    {attendingList.length}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300">
                  <div className="text-sm text-emerald-900 flex items-center gap-1">
                    <Utensils className="w-4 h-4" /> Eters Broedermaal
                  </div>
                  <div className="text-3xl font-bold text-emerald-900">
                    {mealList.length}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-300">
                  <div className="text-sm text-amber-950">
                    Visiteurs (zusterloges)
                  </div>
                  <div className="text-3xl font-bold text-amber-950">
                    {visitorCount}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-100 border border-slate-300">
                  <div className="text-sm text-slate-700">Afgemeld</div>
                  <div className="text-3xl font-bold text-slate-800">
                    {declinedList.length}
                  </div>
                </div>
              </div>

              {loadingRsvps ? (
                <p className="text-slate-600 py-4">Lijst laden...</p>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3">
                      Aanwezige Broeders &amp; Visiteurs ({attendingList.length})
                    </h3>
                    {attendingList.length === 0 ? (
                      <p className="text-slate-600 italic">
                        Nog geen aanmeldingen voor deze avond.
                      </p>
                    ) : (
                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-100 text-slate-800 text-sm border-b border-slate-200">
                              <th className="p-3 font-bold">Naam</th>
                              <th className="p-3 font-bold">Loge &amp; Graad</th>
                              <th className="p-3 font-bold">Broedermaal</th>
                              <th className="p-3 font-bold">
                                Dieetwens / Opmerking
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-sm md:text-base">
                            {attendingList.map((r) => (
                              <tr key={r.id} className="bg-white">
                                <td className="p-3 font-bold text-slate-900">
                                  <div className="flex items-center gap-2.5">
                                    {r.avatarUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={r.avatarUrl}
                                        alt={r.fullName}
                                        className="w-9 h-9 rounded-full object-cover border border-slate-300 shrink-0"
                                      />
                                    ) : null}
                                    <div>
                                      <span>{r.fullName}</span>
                                      {r.isVisitor && (
                                        <span className="ml-2 inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-950 border border-amber-400 text-xs font-bold">
                                          Visiteur
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="p-3 text-slate-700">
                                  <div>
                                    {r.isVisitor
                                      ? `Loge ${r.homeLodgeName} Nr. ${r.homeLodgeNumber} (${r.homeLodgeCity})`
                                      : 'Eigen loge'}
                                  </div>
                                  <div className="text-xs font-semibold text-[#1B365D]">
                                    {DEGREE_SHORT_LABELS[r.degree]}
                                  </div>
                                </td>
                                <td className="p-3">
                                  {r.joinsMeal ? (
                                    <span className="font-bold text-emerald-800">
                                      ✓ Eet mee
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">
                                      Alleen arbeid
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-slate-700">
                                  {r.dietaryNote && (
                                    <div className="font-semibold text-amber-900">
                                      Dieet: {r.dietaryNote}
                                    </div>
                                  )}
                                  {r.comment && <div>{r.comment}</div>}
                                  {!r.dietaryNote && !r.comment && (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {declinedList.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">
                        Bericht van verhindering ({declinedList.length})
                      </h3>
                      <ul className="space-y-1.5 text-sm text-slate-700">
                        {declinedList.map((r) => (
                          <li
                            key={r.id}
                            className="p-2.5 rounded-lg bg-slate-50 border border-slate-200"
                          >
                            <strong>{r.fullName}</strong>
                            {r.comment ? ` — "${r.comment}"` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* TAB 2: Nieuwe Werkplank / Bijeenkomst toevoegen */}
      {subTab === 'new-event' && (
        <section className="bg-white rounded-2xl shadow-sm border border-[#D6D0C4] p-6">
          <h2 className="text-2xl font-bold text-[#1B365D] mb-2">
            Nieuwe Werkplank op de Arbeidstafel plaatsen
          </h2>
          <p className="text-slate-700 mb-6">
            Bijeenkomsten in de 2e of 3e graad zijn automatisch onzichtbaar voor
            broeders met een lagere graad.
          </p>

          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block font-bold text-slate-900 mb-1">
                  Titel / Onderwerp van de avond *
                </label>
                <input
                  type="text"
                  required
                  value={evTitle}
                  onChange={(e) => setEvTitle(e.target.value)}
                  placeholder='Bijv. Comparitie: "Bouwen aan Verbinding"'
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Soort bijeenkomst
                </label>
                <select
                  value={evType}
                  onChange={(e) => setEvType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white"
                >
                  <option value="Comparitie">Comparitie</option>
                  <option value="Open Loge">Open Loge (Rituele arbeid)</option>
                  <option value="Tafelloge">Tafelloge</option>
                  <option value="Huishoudelijke Vergadering">
                    Huishoudelijke Vergadering
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Vereiste Graad (beveiligd)
                </label>
                <select
                  value={evMinDegree}
                  onChange={(e) =>
                    setEvMinDegree(Number(e.target.value) as Degree)
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white"
                >
                  <option value={1}>
                    1e graad — Leerling, Gezel &amp; Meester
                  </option>
                  <option value={2}>
                    2e graad — Uitsluitend Gezel &amp; Meester
                  </option>
                  <option value={3}>3e graad — Uitsluitend Meester</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Datum *
                </label>
                <input
                  type="date"
                  required
                  value={evDate}
                  onChange={(e) => setEvDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Voorhof open
                  </label>
                  <input
                    type="time"
                    value={evDoorsOpen}
                    onChange={(e) => setEvDoorsOpen(e.target.value)}
                    className="w-full px-3 py-3 rounded-xl border-2 border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Aanvang arbeid
                  </label>
                  <input
                    type="time"
                    required
                    value={evStartTime}
                    onChange={(e) => setEvStartTime(e.target.value)}
                    className="w-full px-3 py-3 rounded-xl border-2 border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Spreker / Voorganger
                </label>
                <input
                  type="text"
                  value={evSpeaker}
                  onChange={(e) => setEvSpeaker(e.target.value)}
                  placeholder="Bijv. Br. J. van Dam"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Locatie *
                </label>
                <input
                  type="text"
                  required
                  value={evLocation}
                  onChange={(e) => setEvLocation(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <label className="flex items-start gap-3 p-4 rounded-xl bg-[#FAF8F5] border border-[#D6D0C4] cursor-pointer">
                <input
                  type="checkbox"
                  checked={evHasMeal}
                  onChange={(e) => setEvHasMeal(e.target.checked)}
                  className="mt-1 w-5 h-5 accent-[#1B365D]"
                />
                <div>
                  <div className="font-bold text-slate-900">
                    Met Broedermaal / Maaltijd
                  </div>
                  <div className="text-sm text-slate-600">
                    Leden en visiteurs kunnen met 1 klik aangeven of zij
                    mee-eten.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 rounded-xl bg-[#FAF8F5] border border-[#D6D0C4] cursor-pointer">
                <input
                  type="checkbox"
                  checked={evAllowVisitors}
                  onChange={(e) => setEvAllowVisitors(e.target.checked)}
                  className="mt-1 w-5 h-5 accent-[#1B365D]"
                />
                <div>
                  <div className="font-bold text-slate-900">
                    Openstellen voor Visiteurs van zusterloges
                  </div>
                  <div className="text-sm text-slate-600">
                    Zichtbaar op de Landelijke Arbeidstafel (alleen voor de
                    juiste graad).
                  </div>
                </div>
              </label>
            </div>

            {evHasMeal && (
              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Toelichting Broedermaal (tijdstip &amp; eventuele kosten)
                </label>
                <input
                  type="text"
                  value={evMealInfo}
                  onChange={(e) => setEvMealInfo(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white"
                />
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Volledige tekst van de Werkplank *
              </label>
              <textarea
                required
                rows={6}
                value={evText}
                onChange={(e) => setEvText(e.target.value)}
                placeholder="Schrijf of plak hier de uitnodigingstekst, het programma en eventuele kledingvoorschriften..."
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={savingForm}
              className="py-4 px-8 rounded-xl bg-[#1B365D] hover:bg-[#132642] text-white font-bold text-lg cursor-pointer"
            >
              {savingForm
                ? 'Bezig met plaatsen...'
                : 'Werkplank opslaan & publiceren'}
            </button>
          </form>
        </section>
      )}

      {/* TAB 3: Broeders toevoegen & Graden (Bevordering / Verheffing) beheren */}
      {subTab === 'members' && (
        <div className="space-y-6">
          <section className="bg-white rounded-2xl shadow-sm border border-[#D6D0C4] p-6">
            <h2 className="text-2xl font-bold text-[#1B365D] flex items-center gap-2 mb-2">
              <UserPlus className="w-6 h-6" />
              Nieuwe Broeder toevoegen aan Loge {lodge.name}
            </h2>
            <p className="text-slate-700 mb-5">
              Zodra u een broeder toevoegt met zijn e-mailadres, kan hij direct
              inloggen zonder wachtwoord.
            </p>

            <form
              onSubmit={handleAddMember}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Volledige naam *
                </label>
                <input
                  type="text"
                  required
                  value={memName}
                  onChange={(e) => setMemName(e.target.value)}
                  placeholder="Bijv. Br. Peter Koster"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  E-mailadres *
                </label>
                <input
                  type="email"
                  required
                  value={memEmail}
                  onChange={(e) => setMemEmail(e.target.value)}
                  placeholder="peter@voorbeeld.nl"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Telefoonnummer
                </label>
                <input
                  type="tel"
                  value={memPhone}
                  onChange={(e) => setMemPhone(e.target.value)}
                  placeholder="06-12345678"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Woonplaats
                </label>
                <input
                  type="text"
                  value={memCity}
                  onChange={(e) => setMemCity(e.target.value)}
                  placeholder="Haarlem"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Graad
                </label>
                <select
                  value={memDegree}
                  onChange={(e) =>
                    setMemDegree(Number(e.target.value) as Degree)
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white"
                >
                  <option value={1}>Leerling (1e graad)</option>
                  <option value={2}>Gezel (2e graad)</option>
                  <option value={3}>Meester (3e graad)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Functie / Officier (optioneel)
                </label>
                <input
                  type="text"
                  value={memOfficer}
                  onChange={(e) => {
                    setMemOfficer(e.target.value);
                    if (e.target.value && memRole === 'member') {
                      setMemRole('board');
                    }
                  }}
                  placeholder="Bijv. Redenaar of Ceremoniemeester"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white"
                />
              </div>

              <div className="md:col-span-3 flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-3">
                  <label className="font-bold text-slate-900 text-sm">
                    Rechten in de app:
                  </label>
                  <select
                    value={memRole}
                    onChange={(e) => setMemRole(e.target.value as LodgeRole)}
                    className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-semibold"
                  >
                    <option value="member">Gewoon lid</option>
                    <option value="board">
                      Bestuur / Officier (kan lijsten inzien)
                    </option>
                    <option value="secretary">
                      Secretaris (volledig beheer)
                    </option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={savingForm}
                  className="py-3 px-6 rounded-xl bg-[#1B365D] hover:bg-[#132642] text-white font-bold cursor-pointer"
                >
                  Broeder toevoegen
                </button>
              </div>
            </form>
          </section>

          {/* Bestaande ledenlijst met directe Graad-aanpassing bij Bevordering/Verheffing */}
          <section className="bg-white rounded-2xl shadow-sm border border-[#D6D0C4] p-6">
            <h3 className="text-xl font-bold text-[#1B365D] mb-2">
              Huidige Leden &amp; Graadbeheer (Bevordering / Verheffing)
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Pas na een Bevordering of Verheffing hier met één klik de graad
              aan; de broeder krijgt dan automatisch toegang tot de bijbehorende
              werkplanken en bouwstukken.
            </p>

            <div className="divide-y divide-slate-200">
              {members.map((m) => (
                <MemberManageRow
                  key={m.userId}
                  member={m}
                  onSave={handleUpdateMember}
                />
              ))}
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: Mededeling of Bouwstuk plaatsen */}
      {subTab === 'publish' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-2xl shadow-sm border border-[#D6D0C4] p-6">
            <h2 className="text-xl font-bold text-[#1B365D] flex items-center gap-2 mb-4">
              <Megaphone className="w-5 h-5" />
              Mededeling plaatsen (Eigen Loge)
            </h2>
            <form onSubmit={handlePostAnnouncement} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Onderwerp *
                </label>
                <input
                  type="text"
                  required
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="Bijv. Lief en Leed of Zomerreces"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Rubriek
                </label>
                <select
                  value={annCategory}
                  onChange={(e) => setAnnCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white"
                >
                  <option value="Secretariaat">Secretariaat</option>
                  <option value="Bestuur">Bestuur / Voorzittend Meester</option>
                  <option value="Lief en Leed">Lief en Leed</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Bericht *
                </label>
                <textarea
                  required
                  rows={4}
                  value={annBody}
                  onChange={(e) => setAnnBody(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white"
                />
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={annPinned}
                  onChange={(e) => setAnnPinned(e.target.checked)}
                  className="w-5 h-5 accent-[#1B365D]"
                />
                <span className="text-sm font-semibold text-slate-800">
                  Bovenaan het startscherm vastpinnen
                </span>
              </label>
              <button
                type="submit"
                disabled={savingForm}
                className="w-full py-3 rounded-xl bg-[#1B365D] hover:bg-[#132642] text-white font-bold cursor-pointer"
              >
                Mededeling publiceren
              </button>
            </form>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-[#D6D0C4] p-6">
            <h2 className="text-xl font-bold text-[#1B365D] flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5" />
              Bouwstuk of Document toevoegen
            </h2>
            <form onSubmit={handlePostDocument} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Titel van het Bouwstuk / Document *
                </label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Titel van het stuk"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Auteur / Spreker
                  </label>
                  <input
                    type="text"
                    value={docAuthor}
                    onChange={(e) => setDocAuthor(e.target.value)}
                    placeholder="Br. ..."
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Zichtbaar vanaf Graad
                  </label>
                  <select
                    value={docDegree}
                    onChange={(e) =>
                      setDocDegree(Number(e.target.value) as Degree)
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white"
                  >
                    <option value={1}>1e graad (Alle leden)</option>
                    <option value={2}>2e graad (Gezel &amp; Meester)</option>
                    <option value={3}>3e graad (Alleen Meester)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Korte samenvatting
                </label>
                <input
                  type="text"
                  value={docSummary}
                  onChange={(e) => setDocSummary(e.target.value)}
                  placeholder="Eén korte zin waar het stuk over gaat"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Volledige tekst *
                </label>
                <textarea
                  required
                  rows={5}
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  placeholder="Plak hier de volledige tekst zodat broeders deze comfortabel in grote letters kunnen lezen..."
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white"
                />
              </div>
              <button
                type="submit"
                disabled={savingForm}
                className="w-full py-3 rounded-xl bg-[#1B365D] hover:bg-[#132642] text-white font-bold cursor-pointer"
              >
                Opslaan in Bouwstukken-archief
              </button>
            </form>
          </section>
        </div>
      )}

      {/* TAB 5: Loge-foto van huidige loge + Nieuwe Loge op het platform aansluiten */}
      {subTab === 'new-lodge' && (
        <div className="space-y-6">
          {/* Kaart A: Foto / Wapen van huidige loge instellen */}
          <section className="bg-white rounded-2xl shadow-sm border border-[#D6D0C4] p-6 max-w-2xl">
            <h2 className="text-2xl font-bold text-[#1B365D] flex items-center gap-2 mb-2">
              <Camera className="w-6 h-6" />
              Foto of Wapen van Loge {lodge.name} Nr. {lodge.number}
            </h2>
            <p className="text-slate-700 mb-5">
              Voeg het onderscheidingsteken, wapen of een foto van het
              logegebouw toe voor uw huidige loge. Dit verschijnt bovenin de
              balk én bij bijeenkomsten op de Landelijke Arbeidstafel.
            </p>

            <form onSubmit={handleUpdateCurrentLodge} className="space-y-4">
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#D6D0C4] flex flex-col sm:flex-row items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={curLodgeLogo || '/icon.svg'}
                  alt={`Wapen van Loge ${lodge.name}`}
                  className="w-20 h-20 rounded-xl object-cover border-2 border-[#1B365D]/30 bg-[#1B365D] shrink-0"
                />
                <div className="flex-1 text-center sm:text-left">
                  <div className="font-bold text-slate-900 mb-1">
                    Afbeelding voor Loge {lodge.name}
                  </div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                    <label className="px-4 py-2.5 rounded-xl bg-[#1B365D] hover:bg-[#132642] text-white text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer">
                      <Camera className="w-4 h-4" />
                      <span>
                        {curLodgeLogo ? 'Andere foto kiezen' : 'Foto / Wapen kiezen'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          void handleSelectLodgeImage(e, 'current')
                        }
                        className="sr-only"
                      />
                    </label>

                    {curLodgeLogo && (
                      <button
                        type="button"
                        onClick={() => setCurLodgeLogo('')}
                        className="px-3 py-2.5 rounded-xl bg-white hover:bg-red-50 border border-slate-300 text-red-700 text-sm font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Standaard symbool</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Logekleur (bovenbalk)
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { hex: '#1B365D', label: 'Koningsblauw' },
                    { hex: '#7F1D1D', label: 'Bordeauxrood' },
                    { hex: '#14532D', label: 'Tempelgroen' },
                    { hex: '#4C1D95', label: 'Dieppaars' },
                    { hex: '#78350F', label: 'Warm Brons' },
                  ].map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setCurLodgeColor(c.hex)}
                      className={`px-3.5 py-2 rounded-xl text-white font-bold text-sm cursor-pointer ${
                        curLodgeColor === c.hex
                          ? 'ring-4 ring-amber-400'
                          : 'opacity-80'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={savingForm}
                className="py-3 px-6 rounded-xl bg-[#1B365D] hover:bg-[#132642] text-white font-bold cursor-pointer"
              >
                Wijzigingen voor Loge {lodge.name} opslaan
              </button>
            </form>
          </section>

          {/* Kaart B: Volledig nieuwe Loge aanmaken (mét foto!) */}
          <section className="bg-white rounded-2xl shadow-sm border border-[#D6D0C4] p-6 max-w-2xl">
            <h2 className="text-2xl font-bold text-[#1B365D] flex items-center gap-2 mb-2">
              <Building2 className="w-6 h-6" />
              Nieuwe Loge aansluiten op het Platform
            </h2>
            <p className="text-slate-700 mb-6">
              Voeg hier een nieuwe loge toe (bijvoorbeeld uw eigen loge),
              inclusief een foto of onderscheidingsteken. De ledenlijst en
              stukken blijven strikt gescheiden van andere loges, terwijl
              opengestelde avonden wél te vinden zijn voor visiteurs.
            </p>

            <form onSubmit={handleCreateLodge} className="space-y-4">
              {/* Foto / Wapen voor de nieuwe loge */}
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#D6D0C4] flex flex-col sm:flex-row items-center gap-4">
                {nlLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={nlLogo}
                    alt="Voorbeeld logefoto"
                    className="w-20 h-20 rounded-xl object-cover border-2 border-[#1B365D]/30 bg-white shrink-0"
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-xl flex items-center justify-center border-2 border-white/30 shrink-0"
                    style={{ backgroundColor: nlColor }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/icon.svg"
                      alt="Standaard symbool"
                      className="w-14 h-14"
                    />
                  </div>
                )}

                <div className="flex-1 text-center sm:text-left">
                  <div className="font-bold text-slate-900 mb-1">
                    Foto of Onderscheidingsteken van de Loge (optioneel)
                  </div>
                  <p className="text-xs text-slate-600 mb-2">
                    Kies het logewapen, onderscheidingsteken of een foto van het
                    gebouw vanaf uw computer of telefoon.
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <label className="px-4 py-2 rounded-xl bg-[#1B365D] hover:bg-[#132642] text-white text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer">
                      <Camera className="w-4 h-4" />
                      <span>
                        {nlLogo ? 'Andere foto kiezen' : 'Foto toevoegen'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => void handleSelectLodgeImage(e, 'new')}
                        className="sr-only"
                      />
                    </label>
                    {nlLogo && (
                      <button
                        type="button"
                        onClick={() => setNlLogo('')}
                        className="px-3 py-2 rounded-xl bg-white hover:bg-red-50 border border-slate-300 text-red-700 text-sm font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Verwijderen</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Logenummer *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={nlNumber}
                    onChange={(e) => setNlNumber(e.target.value)}
                    placeholder="Bijv. 87"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-900 mb-1">
                    Naam van de Loge (zonder &apos;Loge&apos;) *
                  </label>
                  <input
                    type="text"
                    required
                    value={nlName}
                    onChange={(e) => setNlName(e.target.value)}
                    placeholder="Bijv. La Paix of Vicit Vim Virtus"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Oosten (Stad) *
                  </label>
                  <input
                    type="text"
                    required
                    value={nlCity}
                    onChange={(e) => setNlCity(e.target.value)}
                    placeholder="Bijv. Leiden"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Vaste bijeenkomstdag
                  </label>
                  <input
                    type="text"
                    value={nlMeetingDay}
                    onChange={(e) => setNlMeetingDay(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Adres van het Logegebouw *
                </label>
                <input
                  type="text"
                  required
                  value={nlAddress}
                  onChange={(e) => setNlAddress(e.target.value)}
                  placeholder="Straat en huisnummer, Postcode Plaats"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Logekleur (bovenbalk)
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { hex: '#1B365D', label: 'Koningsblauw' },
                    { hex: '#7F1D1D', label: 'Bordeauxrood' },
                    { hex: '#14532D', label: 'Tempelgroen' },
                    { hex: '#4C1D95', label: 'Dieppaars' },
                    { hex: '#78350F', label: 'Warm Brons' },
                  ].map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setNlColor(c.hex)}
                      className={`px-3.5 py-2 rounded-xl text-white font-bold text-sm cursor-pointer ${
                        nlColor === c.hex
                          ? 'ring-4 ring-amber-400'
                          : 'opacity-80'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={savingForm}
                className="py-3.5 px-7 rounded-xl bg-[#1B365D] hover:bg-[#132642] text-white font-bold text-lg cursor-pointer"
              >
                Loge aanmaken &amp; openen
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function MemberManageRow({
  member,
  onSave,
}: {
  member: LodgeMemberView;
  onSave: (
    member: LodgeMemberView,
    degree: Degree,
    role: LodgeRole,
    officerTitle: string
  ) => Promise<void>;
}) {
  const [degree, setDegree] = useState<Degree>(member.degree);
  const [role, setRole] = useState<LodgeRole>(member.role);
  const [officer, setOfficer] = useState(member.officerTitle || '');
  const dirty =
    degree !== member.degree ||
    role !== member.role ||
    officer !== (member.officerTitle || '');

  return (
    <div className="py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {member.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.avatarUrl}
            alt={member.fullName}
            className="w-11 h-11 rounded-full object-cover border border-slate-300 shrink-0"
          />
        ) : null}
        <div>
          <div className="font-bold text-slate-900">{member.fullName}</div>
          <div className="text-sm text-slate-600">
            {member.email} {member.phone ? `· ${member.phone}` : ''}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label={`Graad van ${member.fullName}`}
          value={degree}
          onChange={(e) => setDegree(Number(e.target.value) as Degree)}
          className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-semibold"
        >
          <option value={1}>1e gr · Leerling</option>
          <option value={2}>2e gr · Gezel</option>
          <option value={3}>3e gr · Meester</option>
        </select>

        <select
          aria-label={`Rol van ${member.fullName}`}
          value={role}
          onChange={(e) => setRole(e.target.value as LodgeRole)}
          className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
        >
          <option value="member">Lid</option>
          <option value="board">Officier / Bestuur</option>
          <option value="secretary">Secretaris</option>
        </select>

        <input
          type="text"
          value={officer}
          onChange={(e) => setOfficer(e.target.value)}
          placeholder="Functietitel (optioneel)"
          className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm w-44"
        />

        {dirty && (
          <button
            type="button"
            onClick={() => void onSave(member, degree, role, officer)}
            className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold cursor-pointer"
          >
            Opslaan
          </button>
        )}
      </div>
    </div>
  );
}
