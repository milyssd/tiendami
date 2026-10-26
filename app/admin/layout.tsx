import { redirect } from 'next/navigation';
import { session } from '@/lib/server/auth';
export const metadata = {
  title: 'Administración',
  robots: { index: false, follow: false },
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const s = await session();
  if (
    !s ||
    !['ADMIN', 'SUPPORT'].includes(s.user.role) ||
    (s.user.role === 'ADMIN' && (!s.user.totpEnabled || !s.twoFactorVerified))
  )
    redirect('/cuenta');
  return children;
}
