"use client";

import { useState } from "react";

/** Photo gallery: one large image with clickable thumbnails below. */
export function Gallery({ urls, alt }: { urls: string[]; alt: string }) {
  const [active, setActive] = useState(0);

  if (urls.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        No photo
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urls[active]}
          alt={alt}
          className="aspect-square w-full object-contain"
        />
      </div>
      {urls.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {urls.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(i)}
              className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${
                i === active ? "border-slate-900" : "border-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`${alt} ${i + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
