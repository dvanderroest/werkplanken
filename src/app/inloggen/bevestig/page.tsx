import MagicConfirmClient from './MagicConfirmClient';

export default async function MagicConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return <MagicConfirmClient token={params.token || ''} />;
}
