import OneClickRsvpClient from './OneClickRsvpClient';

export default async function OneClickRsvpPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; keuze?: string }>;
}) {
  const params = await searchParams;
  return (
    <OneClickRsvpClient
      token={params.token || ''}
      choice={params.keuze || 'aanwezig'}
    />
  );
}
