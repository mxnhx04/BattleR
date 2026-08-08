"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrJoinCode({ size = 200 }: { size?: number }) {
  const [state, setState] = useState<{ dataUrl: string; url: string }>();

  useEffect(() => {
    let cancelled = false;
    const target = `${window.location.origin}/game`;

    QRCode.toDataURL(target, {
      width: size,
      margin: 1,
      color: { dark: "#0D0D0D", light: "#F5F6F8" },
    })
      .then((dataUrl) => {
        if (!cancelled) setState({ dataUrl, url: target });
      })
      .catch(() => {
        if (!cancelled) setState(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [size]);

  if (!state) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-xl overflow-hidden border-4 border-brand-gold shadow-[0_0_20px_rgba(241,211,43,0.4)] bg-brand-white">
        {/* Data URI from client-generated QR — next/image optimization doesn't apply here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={state.dataUrl} alt="Scan to join the battle" width={size} height={size} />
      </div>
      <div className="text-xs tracking-[0.2em] text-brand-gray uppercase">
        Scan to Join
      </div>
      <div className="text-[0.65rem] text-brand-gray/70 font-mono break-all text-center max-w-[220px]">
        {state.url}
      </div>
    </div>
  );
}
