'use client';
import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Check, Download } from 'lucide-react';
import { useStore } from './store';
type Lesson = {
  id: string;
  title: string;
  text: string | null;
  video: boolean;
  seconds: number;
  completed: boolean;
};
export function Classroom({
  id,
  title,
  email,
  lessons,
  certificate,
}: {
  id: string;
  title: string;
  email: string;
  lessons: Lesson[];
  certificate: string | null;
}) {
  const s = useStore();
  const [selected, setSelected] = useState(lessons[0]?.id);
  const [progress, setProgress] = useState(lessons);
  const video = useRef<HTMLVideoElement>(null);
  const current = progress.find((l) => l.id === selected);
  const [cert, setCert] = useState(certificate);
  const [failedLesson, setFailedLesson] = useState<string | null>(null);
  const videoError = failedLesson === current?.id;
  useEffect(() => {
    if (!current?.video || !video.current) return;
    const el = video.current;
    const lessonId = current.id;
    const seconds = current.seconds;
    let cancelled = false;
    let hls: Hls | undefined;
    const renew = async () => {
      try {
        const r = await fetch('/api/media-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonId }),
        });
        if (!r.ok && !cancelled) {
          setFailedLesson(lessonId);
          el.pause();
          return false;
        }
        return true;
      } catch {
        if (!cancelled) setFailedLesson(lessonId);
        return false;
      }
    };
    const resume = () => {
      el.currentTime = seconds;
    };
    const play = () => {
      setFailedLesson(null);
      void renew();
    };
    el.addEventListener('loadedmetadata', resume, { once: true });
    el.addEventListener('play', play);
    void (async () => {
      if (!(await renew()) || cancelled) return;
      const url = `/api/media/${lessonId}/playlist.m3u8`;
      if (el.canPlayType('application/vnd.apple.mpegurl')) el.src = url;
      else if (Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(el);
        hls.on(Hls.Events.ERROR, (_, d) => {
          if (d.fatal && !cancelled) setFailedLesson(lessonId);
        });
      }
    })();
    const timer = setInterval(() => {
      if (!el.paused) void renew();
    }, 45000);
    return () => {
      cancelled = true;
      clearInterval(timer);
      hls?.destroy();
      el.removeEventListener('loadedmetadata', resume);
      el.removeEventListener('play', play);
    };
  }, [selected, current?.video, current?.id, current?.seconds]);

  async function save(completed: boolean) {
    if (!current) return;
    const r = await fetch('/api/learning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enrollmentId: id,
        lessonId: current.id,
        seconds: Math.floor(video.current?.currentTime ?? current.seconds),
        completed,
      }),
    });
    const d = await r.json();
    if (!r.ok) {
      s.notify(d.error);
      return;
    }
    setProgress((old) =>
      old.map((l) =>
        l.id === current.id ? { ...l, completed: l.completed || completed } : l,
      ),
    );
    if (d.completed === d.total) setCert('available');
    s.notify('Progreso guardado.');
  }
  if (!current)
    return (
      <div className="empty-state">
        <h1>EL TEMARIO ESTÁ EN PREPARACIÓN.</h1>
      </div>
    );
  return (
    <main className="shell">
      <span className="eyebrow" style={{ marginTop: 30 }}>
        TU SIGUIENTE HABILIDAD
      </span>
      <h1 className="page-title">{title}</h1>
      <div className="progress-bar">
        <div
          style={{
            width: `${(progress.filter((l) => l.completed).length / progress.length) * 100}%`,
          }}
        />
      </div>
      <p className="fine-print">
        {progress.filter((l) => l.completed).length} de {progress.length}{' '}
        lecciones completadas
      </p>
      <div className="lesson-layout">
        <aside className="lesson-nav">
          {progress.map((l, i) => (
            <button
              key={l.id}
              className={selected === l.id ? 'selected' : ''}
              onClick={() => {
                setSelected(l.id);
                setFailedLesson(null);
              }}
            >
              {l.completed ? '✓' : `${i + 1}.`} {l.title}
            </button>
          ))}
          {cert && (
            <a className="button blue" href={`/api/certificates/${id}`}>
              <Download size={14} />
              Certificado
            </a>
          )}
        </aside>
        <section>
          <h2 style={{ fontSize: 30, marginBottom: 20 }}>{current.title}</h2>
          {current.video && (
            <div className="video-wrap">
              <video
                ref={video}
                controls
                controlsList="nodownload"
                onPause={() => void save(false)}
                onEnded={() => void save(true)}
              />
              <span className="watermark">{email}</span>
            </div>
          )}
          {videoError && (
            <p className="form-error">
              No se pudo cargar el video. Recarga la página para renovar el
              acceso.
            </p>
          )}
          <p style={{ margin: '20px 0' }}>{current.text}</p>
          <button className="button blue" onClick={() => void save(true)}>
            <Check size={16} />
            Marcar como completada
          </button>
        </section>
      </div>
    </main>
  );
}
