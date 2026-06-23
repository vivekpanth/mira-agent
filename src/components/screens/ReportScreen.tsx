"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useSession } from "@/lib/useSession";
import { ScoreDial } from "@/components/ui/ScoreDial";
import { SubscoreBars } from "@/components/ui/SubscoreBars";
import { MetricChips } from "@/components/ui/MetricChips";
import { RubricSummary } from "@/components/ui/RubricSummary";
import { EvidenceList } from "@/components/ui/EvidenceList";
import { TipCards } from "@/components/ui/TipCards";
import { Button } from "@/components/ui/button";

function ConfettiBurst({ score }: { score: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (score < 85) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const COLORS = ["#0fb5ae", "#ff9900", "#ffffff"];
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: -10 - Math.random() * 80,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 3,
      size: 3 + Math.random() * 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.2,
    }));

    let raf = 0;
    let elapsed = 0;

    function draw() {
      elapsed++;
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      let alive = 0;
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.rotation += p.spin;
        if (p.y < canvas!.height + 20) alive++;
        const alpha = Math.max(0, 1 - elapsed / 140);
        ctx!.save();
        ctx!.globalAlpha = alpha;
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rotation);
        ctx!.fillStyle = p.color;
        ctx!.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx!.restore();
      });
      if (alive > 0 && elapsed < 160) raf = requestAnimationFrame(draw);
      else ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  if (score < 85) return null;
  return (
    <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-50 no-print" aria-hidden />
  );
}

function scoreLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 55) return "Developing";
  return "Early stage";
}

function ReportCard({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl bg-white px-5 py-5 ring-1 ring-navy2/10 ${className}`}>
      {title && (
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-dim">{title}</h2>
      )}
      {children}
    </section>
  );
}

export function ReportScreen() {
  const { report, recordingUrl, reset } = useSession();

  if (!report) return null;

  const label = scoreLabel(report.overall);
  const date = new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-paper">
      <ConfettiBurst score={report.overall} />

      <div className="hidden print:flex items-center justify-between border-b border-navy2/15 pb-3 mb-6">
        <span className="text-lg font-bold text-navy">MIRA — Coaching Report</span>
        <span className="text-xs text-dim">{date}</span>
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 print:max-w-none print:px-0 print:py-0">
        {/* ── Hero ───────────────────────────────────────────────────── */}
        <header className="mb-6 flex items-center gap-6">
          <ScoreDial score={report.overall} size={120} label="Score" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-dim">{date}</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-navy">{label}</h1>
            <p className="mt-1 text-sm text-dim leading-relaxed">
              Your session scored {report.overall}/100. Scores below are computed from your transcript.
            </p>
          </div>
        </header>

        <div className="space-y-4">
          {/* ── Rubric ─────────────────────────────────────────────── */}
          <ReportCard title="Expression · Communication · Fluency">
            <RubricSummary report={report} compact />
          </ReportCard>

          {/* ── Skills ───────────────────────────────────────────────── */}
          <ReportCard title="Skill breakdown">
            <SubscoreBars subscores={report.subscores} />
          </ReportCard>

          {/* ── Stats ────────────────────────────────────────────────── */}
          <ReportCard title="Session stats">
            <MetricChips metrics={report.metrics} compact />
          </ReportCard>

          {/* ── Evidence ───────────────────────────────────────────── */}
          {report.evidence.length > 0 && (
            <ReportCard title="What stood out">
              <EvidenceList evidence={report.evidence} />
            </ReportCard>
          )}

          {/* ── Tips ─────────────────────────────────────────────────── */}
          <ReportCard title="Try next time">
            <TipCards tips={report.tips} />
          </ReportCard>
        </div>

        {/* ── Actions ────────────────────────────────────────────────── */}
        <footer className="no-print mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={() => window.print()} className="bg-navy text-white hover:bg-navy2">
            Download PDF
          </Button>
          {recordingUrl ? (
            <a
              href={recordingUrl}
              download="mira-rehearsal.webm"
              className="inline-flex items-center justify-center rounded-xl bg-teal px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-dark"
            >
              Download recording
            </a>
          ) : null}
          <Button
            onClick={reset}
            variant="outline"
            className="border-navy2/15 text-navy hover:bg-navy/5"
          >
            Rehearse again
          </Button>
        </footer>
      </div>
    </div>
  );
}
