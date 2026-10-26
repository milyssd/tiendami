import { Account } from '@/components/account';
export const metadata = {
  title: 'Tu cuenta y tus compras',
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const params = await searchParams;
  return <Account initialMode={params.reset ? 'reset' : 'login'} />;
}
