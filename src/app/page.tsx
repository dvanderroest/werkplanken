import LoginScreen from '@/components/LoginScreen';
import PortalDashboard from '@/components/PortalDashboard';
import { getCurrentUser } from '@/lib/auth';
import {
  canManageLodge,
  getLodgeAnnouncements,
  getLodgeById,
  getLodgeDocuments,
  getLodgeMembers,
  getOwnLodgeEvents,
  getVisitorEvents,
} from '@/lib/db';
import { isDevMailboxEnabled } from '@/lib/mailer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function HomePage() {
  const user = await getCurrentUser();
  const devMailbox = isDevMailboxEnabled();

  if (!user) {
    return <LoginScreen devMailboxEnabled={devMailbox} />;
  }

  const activeLodge = getLodgeById(user.activeLodgeId);
  if (!activeLodge) {
    return <LoginScreen devMailboxEnabled={devMailbox} />;
  }

  const canManage = canManageLodge(user, activeLodge.id);
  const ownEvents = getOwnLodgeEvents(user, activeLodge.id);
  const visitorEvents = getVisitorEvents(user, activeLodge.id);
  const members = getLodgeMembers(user, activeLodge.id);
  const documents = getLodgeDocuments(user, activeLodge.id);
  const announcements = getLodgeAnnouncements(user, activeLodge.id);

  return (
    <PortalDashboard
      user={user}
      activeLodge={activeLodge}
      canManage={canManage}
      ownEvents={ownEvents}
      visitorEvents={visitorEvents}
      members={members}
      documents={documents}
      announcements={announcements}
    />
  );
}
