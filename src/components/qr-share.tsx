"use client";

import { useState } from "react";
import { Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QrShareProps {
  url: string;
  title: string;
}

export function QrShare({ url, title }: QrShareProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const fullUrl = typeof window !== "undefined"
    ? `${window.location.origin}${url}`
    : url;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(fullUrl)}&bgcolor=1a1412&color=fff7ed&format=svg`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: fullUrl });
      } catch {
        // user cancelled
      }
    }
  };

  return (
    <div className="relative">
      <Button variant="ghost" onClick={() => setOpen(!open)} className="gap-2">
        <Share2 className="size-4" />
        Compartir
      </Button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-white/10 bg-[#1a1412] p-4 shadow-2xl">
          <p className="text-sm font-semibold mb-3">{title}</p>

          {/* QR Code */}
          <div className="flex justify-center rounded-xl bg-white p-3 mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrImageUrl}
              alt="QR Code"
              width={160}
              height={160}
              className="rounded"
            />
          </div>

          {/* URL + Copy */}
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2">
            <p className="flex-1 truncate text-xs text-[#d6d3d1]">{fullUrl}</p>
            <button
              onClick={handleCopy}
              className="shrink-0 rounded-lg p-1.5 transition hover:bg-white/10"
              type="button"
            >
              {copied ? (
                <Check className="size-4 text-green-400" />
              ) : (
                <Copy className="size-4 text-[#a8a29e]" />
              )}
            </button>
          </div>

          {/* Native share (mobile) */}
          {"share" in (typeof navigator !== "undefined" ? navigator : {}) && (
            <Button
              variant="primary"
              onClick={handleNativeShare}
              className="mt-3 w-full"
            >
              <Share2 className="mr-2 size-4" />
              Compartir enlace
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
