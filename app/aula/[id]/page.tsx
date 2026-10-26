import { notFound, redirect } from 'next/navigation';
import { session } from '@/lib/server/auth';
import { db } from '@/lib/server/db';
import { Classroom } from '@/components/classroom';
export const metadata = {
  title: 'Mi aula',
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = await session();
  if (!s) redirect('/cuenta');
  const e = await db.enrollment.findFirst({
    where: {
      id: id,
      userId: s.userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: {
      progress: true,
      course: {
        include: {
          product: true,
          modules: {
            orderBy: { position: 'asc' },
            include: { lessons: { orderBy: { position: 'asc' } } },
          },
        },
      },
    },
  });
  if (!e) notFound();
  return (
    <Classroom
      id={e.id}
      title={e.course.product.name}
      email={s.user.email}
      certificate={e.certificateCode}
      lessons={e.course.modules.flatMap((m) =>
        m.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          text: l.text,
          video: !!l.storagePath,
          seconds: e.progress.find((p) => p.lessonId === l.id)?.seconds ?? 0,
          completed:
            e.progress.find((p) => p.lessonId === l.id)?.completed ?? false,
        })),
      )}
    />
  );
}
