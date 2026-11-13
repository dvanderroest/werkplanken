'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  MapPin,
  MessageSquare,
  Shield,
  Utensils,
  X,
} from 'lucide-react';
import { formatDutchDate, formatRelativeDays } from '@/lib/format';
import {
  DEGREE_SHORT_LABELS,
  type Degree,
  type LodgeEvent,
  type RsvpStatus,
} from '@/lib/types';

interface EventCardProps {
  event: LodgeEvent;
  isVisitorMode?: boolean;
  defaultDietary?: string;
  defaultExpanded?: boolean;
}

function degreeBadgeClasses(deg: Degree): string {
  if (deg === 1) return 'bg-sky-100 text-sky-950 border-sky-300';
  if (deg === 2) return 'bg-amber-100 text-amber-950 border-amber-300';
  return 'bg-purple-100 text-purple-950 border-purple-300';
}

export default function EventCard({
  event,
  isVisitorMode = false,
  defaultDietary = '',
  defaultExpanded = false,
}: EventCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [showNotes, setShowNotes] = useState(
    Boolean(event.myRsvp?.dietaryNote || event.myRsvp?.comment)
  );
  const [dietaryNote, setDietaryNote] = useState(
    event.myRsvp?.dietaryNote ?? defaultDietary
  );
  const [comment, setComment] = useState(event.myRsvp?.comment ?? '');
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const relativeLabel = formatRelativeDays(event.eventDate);
  const currentStatus = event.myRsvp?.status || null;
  const currentMeal = event.myRsvp?.joinsMeal || false;

  async function submitRsvp(status: RsvpStatus, joinsMeal: boolean) {
    setSaving(true);
    setErrorMsg('');
    setSavedBanner('');
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          status,
          joinsMeal,
          dietaryNote,
          comment,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        isVisitor?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'Opslaan is niet gelukt.');
        return;
      }

      if (status === 'declined') {
        setSavedBanner('Uw afmelding is doorgegeven aan de Secretaris.');
      } else if (data.isVisitor) {
        setSavedBanner(
          joinsMeal
            ? 'U staat aangemeld als Visiteur (inclusief Broedermaal)! Uw moederloge en graad zijn doorgegeven.'
            : 'U staat aangemeld als Visiteur! Uw moederloge en graad zijn doorgegeven aan de ontvangende Secretaris.'
        );
      } else {
        setSavedBanner(
          joinsMeal
            ? 'Opgeslagen: Aanwezig + Broedermaal!'
            : 'Opgeslagen: U staat als aanwezig genoteerd.'
        );
      }
      router.refresh();
    } catch {
      setErrorMsg('Controleer uw verbinding en probeer het opnieuw.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="bg-white rounded-2xl shadow-sm border border-[#D6D0C4] overflow-hidden">
      {/* Bovenbalk met Loge (bij visiteren), Datum en Huidige Status */}
      <div
        className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2"
        style={{
          borderTopWidth: '5px',
          borderTopColor: event.lodgeAccentColor || '#1B365D',
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          {isVisitorMode && (
            <span
              className="px-3 py-1 rounded-lg text-white font-bold text-sm inline-flex items-center gap-2"
              style={{ backgroundColor: event.lodgeAccentColor || '#1B365D' }}
            >
              {event.lodgeLogoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={event.lodgeLogoUrl}
                  alt={`Loge ${event.lodgeName}`}
                  className="w-6 h-6 rounded object-cover bg-white/15 shrink-0"
                />
              )}
              <span>
                Loge {event.lodgeName} Nr. {event.lodgeNumber} · Oosten{' '}
                {event.lodgeCity}
              </span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 font-bold text-[#1B365D]">
            <Calendar className="w-4 h-4 shrink-0" />
            <span className="capitalize">
              {formatDutchDate(event.eventDate)}
            </span>
          </span>
          {relativeLabel && (
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
              {relativeLabel}
            </span>
          )}
        </div>

        {/* Eigen RSVP status badge */}
        <div>
          {currentStatus === 'attending' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-400 text-sm font-bold">
              <Check className="w-4 h-4 text-emerald-800" />
              {isVisitorMode ? 'Aangemeld als Visiteur' : 'U bent aangemeld'}
              {currentMeal ? ' + Broedermaal' : ''}
            </span>
          )}
          {currentStatus === 'declined' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200 text-slate-800 text-sm font-bold">
              <X className="w-4 h-4" />
              U bent afgemeld
            </span>
          )}
          {!currentStatus && !isVisitorMode && (
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 text-amber-950 border border-amber-300 text-sm font-semibold">
              Aanwezigheid nog doorgeven
            </span>
          )}
        </div>
      </div>

      {/* Hoofdinhoud */}
      <div className="p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-md bg-[#1B365D]/10 text-[#1B365D] text-xs font-bold uppercase tracking-wide">
            {event.eventType}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border text-xs font-bold ${degreeBadgeClasses(
              event.minDegree
            )}`}
          >
            <Shield className="w-3.5 h-3.5" />
            {DEGREE_SHORT_LABELS[event.minDegree]}
          </span>
          {!isVisitorMode && event.allowVisitors && (
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-medium">
              Visiteurs welkom
            </span>
          )}
        </div>

        <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3">
          {event.title}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-slate-700 text-sm md:text-base mb-4">
          <div className="flex items-start gap-2">
            <Clock className="w-5 h-5 text-[#1B365D] shrink-0 mt-0.5" />
            <span>
              Aanvang <strong>{event.startTime} uur</strong> (Voorhof open vanaf{' '}
              {event.doorsOpenTime} uur)
            </span>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="w-5 h-5 text-[#1B365D] shrink-0 mt-0.5" />
            <span>{event.location}</span>
          </div>
          {event.speaker && (
            <div className="flex items-start gap-2">
              <FileText className="w-5 h-5 text-[#1B365D] shrink-0 mt-0.5" />
              <span>
                Verzorgd door: <strong>{event.speaker}</strong>
              </span>
            </div>
          )}
          {event.hasMeal && (
            <div className="flex items-start gap-2">
              <Utensils className="w-5 h-5 text-[#B8860B] shrink-0 mt-0.5" />
              <span>{event.mealInfo || 'Met Broedermaal'}</span>
            </div>
          )}
        </div>

        {/* Werkplank uitklappen/lezen */}
        <div className="mb-5">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FAF8F5] hover:bg-slate-100 border border-[#D6D0C4] text-[#1B365D] font-bold transition cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>
              {expanded
                ? 'Werkplank inklappen'
                : 'Lees de volledige Werkplank & programma'}
            </span>
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {expanded && (
            <div className="mt-3 p-5 rounded-xl bg-[#FAF8F5] border-l-4 border-[#1B365D] text-slate-800 whitespace-pre-line leading-relaxed">
              {event.werkplankText}
            </div>
          )}
        </div>

        {/* Melding na opslaan of fout */}
        {savedBanner && (
          <div
            role="status"
            className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-500 text-emerald-950 font-semibold flex items-center gap-2"
          >
            <Check className="w-5 h-5 text-emerald-700 shrink-0" />
            <span>{savedBanner}</span>
          </div>
        )}
        {errorMsg && (
          <div
            role="alert"
            className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-500 text-red-950 font-semibold"
          >
            {errorMsg}
          </div>
        )}

        {/* Grote, duidelijke 1-klik Aan-/Afmeldknoppen */}
        <div className="pt-4 border-t border-slate-200">
          <p className="font-bold text-slate-900 mb-3">
            {isVisitorMode
              ? 'Wilt u deze zusterloge als Visiteur bezoeken? Meld u met 1 klik aan:'
              : 'Geef met 1 klik uw aanwezigheid door:'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {event.hasMeal && (
              <button
                type="button"
                disabled={saving}
                onClick={() => void submitRsvp('attending', true)}
                className={`py-3.5 px-4 rounded-xl font-bold text-base inline-flex items-center justify-center gap-2 border-2 transition cursor-pointer ${
                  currentStatus === 'attending' && currentMeal
                    ? 'bg-emerald-700 border-emerald-800 text-white shadow-sm'
                    : 'bg-white hover:bg-emerald-50 border-emerald-700 text-emerald-900'
                }`}
              >
                <Utensils className="w-5 h-5 shrink-0" />
                <span>
                  {isVisitorMode
                    ? 'Visiteren + Broedermaal'
                    : 'Aanwezig + Broedermaal'}
                </span>
              </button>
            )}

            <button
              type="button"
              disabled={saving}
              onClick={() => void submitRsvp('attending', false)}
              className={`py-3.5 px-4 rounded-xl font-bold text-base inline-flex items-center justify-center gap-2 border-2 transition cursor-pointer ${
                currentStatus === 'attending' && !currentMeal
                  ? 'bg-[#1B365D] border-[#132642] text-white shadow-sm'
                  : 'bg-white hover:bg-slate-50 border-[#1B365D] text-[#1B365D]'
              }`}
            >
              <Check className="w-5 h-5 shrink-0" />
              <span>
                {event.hasMeal
                  ? isVisitorMode
                    ? 'Visiteren (zonder maaltijd)'
                    : 'Alleen Arbeid (geen maaltijd)'
                  : isVisitorMode
                    ? 'Aanmelden als Visiteur'
                    : 'Ik ben aanwezig'}
              </span>
            </button>

            {(!isVisitorMode || currentStatus !== null) && (
              <button
                type="button"
                disabled={saving}
                onClick={() => void submitRsvp('declined', false)}
                className={`py-3.5 px-4 rounded-xl font-bold text-base inline-flex items-center justify-center gap-2 border-2 transition cursor-pointer ${
                  currentStatus === 'declined'
                    ? 'bg-slate-700 border-slate-800 text-white'
                    : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                }`}
              >
                <X className="w-5 h-5 shrink-0" />
                <span>
                  {isVisitorMode ? 'Bezoek annuleren' : 'Ik ben verhinderd'}
                </span>
              </button>
            )}
          </div>

          {/* Dieetwens of korte boodschap voor Secretaris / Hofmeester */}
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowNotes(!showNotes)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-[#1B365D] cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>
                {showNotes
                  ? 'Dieetwens / opmerking verbergen'
                  : 'Dieetwens of opmerking toevoegen (optioneel)'}
              </span>
            </button>

            {showNotes && (
              <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {event.hasMeal && (
                  <div>
                    <label className="block text-sm font-bold text-slate-800 mb-1">
                      Dieetwens voor de Hofmeester
                    </label>
                    <input
                      type="text"
                      value={dietaryNote}
                      onChange={(e) => setDietaryNote(e.target.value)}
                      placeholder="Bijv. vegetarisch, glutenvrij..."
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900"
                    />
                  </div>
                )}
                <div className={event.hasMeal ? '' : 'sm:col-span-2'}>
                  <label className="block text-sm font-bold text-slate-800 mb-1">
                    Korte opmerking voor de Secretaris
                  </label>
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Bijv. iets later aanwezig of hartelijke groet"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900"
                  />
                </div>
                {currentStatus && (
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void submitRsvp(currentStatus, currentMeal)}
                      className="px-4 py-2 rounded-lg bg-[#1B365D] text-white font-semibold text-sm cursor-pointer"
                    >
                      Dieetwens / opmerking opslaan
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Beknopte teller alleen voor eigen loge */}
          {!isVisitorMode && event.stats && (
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs sm:text-sm text-slate-600 flex flex-wrap gap-x-5 gap-y-1">
              <span>
                <strong>{event.stats.attendingMembers}</strong> eigen leden
                aanwezig
              </span>
              {event.stats.attendingVisitors > 0 && (
                <span>
                  <strong>{event.stats.attendingVisitors}</strong> visiteur(s)
                  aangemeld
                </span>
              )}
              {event.hasMeal && (
                <span>
                  <strong>{event.stats.mealCount}</strong> eters bij het
                  Broedermaal
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
