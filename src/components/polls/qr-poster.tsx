"use client";

import { useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { toPng } from "html-to-image";

type QrPosterProps = {
  pollTitle: string;
  pollUrl: string;
};

export function QrPoster({ pollTitle, pollUrl }: QrPosterProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [theme, setTheme] = useState("from-white to-amber-50");
  const safeTitle = useMemo(() => pollTitle.replace(/\s+/g, "-").toLowerCase(), [pollTitle]);

  async function downloadPng() {
    if (!cardRef.current) return;
    setDownloading(true);

    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
      const anchor = document.createElement("a");
      anchor.download = `${safeTitle || "poll"}-poster.png`;
      anchor.href = dataUrl;
      anchor.click();
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className="card">
      <h3 className="text-lg font-semibold text-slate-900">Share Poll QR</h3>
      <p className="mt-1 text-sm text-slate-600">Print-friendly A4 poster with downloadable QR code.</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="chip" onClick={() => setTheme("from-white to-amber-50")}>
          Classic
        </button>
        <button type="button" className="chip" onClick={() => setTheme("from-cyan-50 to-sky-100")}>
          Sky
        </button>
        <button type="button" className="chip" onClick={() => setTheme("from-emerald-50 to-teal-100")}>
          Mint
        </button>
      </div>

      <div
        ref={cardRef}
        className={`mt-4 rounded-2xl border border-slate-200 bg-gradient-to-br ${theme} p-5`}
      >
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Campus Pulse</p>
        <h4 className="mt-2 text-xl font-bold text-slate-900">{pollTitle}</h4>
        <p className="mt-1 text-sm text-slate-700">Scan to Vote</p>

        <div className="mt-4 inline-flex rounded-xl bg-white p-3 shadow-sm">
          <QRCode value={pollUrl} size={170} />
        </div>
      </div>

      <button className="btn-primary mt-4" onClick={downloadPng} type="button" disabled={downloading}>
        {downloading ? "Preparing PNG..." : "Download QR Poster"}
      </button>
    </section>
  );
}
