"use client";

import { useRef, useState } from "react";

/**
 * Photo gallery: a swipeable track of full-width images.
 *
 * The track is a CSS scroll-snap carousel rather than a JS gesture handler —
 * swipe, momentum and rubber-banding all come from the platform, and it still
 * works with a mouse wheel or a keyboard. `active` is derived *from* the scroll
 * position rather than driving it, so a swipe and a thumbnail click converge on
 * the same state.
 *
 * Below `sm` the indicator is a row of dots; thumbnails only appear once there's
 * room for them.
 */
export function Gallery({ urls, alt }: { urls: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  if (urls.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        No photo
      </div>
    );
  }

  function scrollTo(index: number) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
  }

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const track = e.currentTarget;
    if (track.clientWidth === 0) return;
    const index = Math.round(track.scrollLeft / track.clientWidth);
    // Guard against the smooth-scroll animation firing setState every frame.
    setActive((prev) => (prev === index ? prev : index));
  }

  const multiple = urls.length > 1;

  return (
    <div>
      <div
        ref={trackRef}
        onScroll={multiple ? onScroll : undefined}
        // [scrollbar-width:none] hides the desktop scrollbar; the dots and
        // thumbnails are the affordance.
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-xl border border-slate-200 bg-slate-100 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {urls.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={url}
            src={url}
            alt={urls.length > 1 ? `${alt} — photo ${i + 1}` : alt}
            className="aspect-square w-full shrink-0 snap-center object-contain"
          />
        ))}
      </div>

      {multiple && (
        <>
          <div className="mt-3 flex justify-center gap-2 sm:hidden">
            {urls.map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={() => scrollTo(i)}
                aria-label={`Photo ${i + 1} of ${urls.length}`}
                aria-current={i === active ? "true" : undefined}
                // 8px dot, 32px target — the padding is the hit area.
                className="flex h-8 w-8 touch-manipulation items-center justify-center"
              >
                <span
                  className={`h-2 w-2 rounded-full transition ${
                    i === active ? "bg-slate-900" : "bg-slate-300"
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="mt-3 hidden flex-wrap gap-2 sm:flex">
            {urls.map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={() => scrollTo(i)}
                aria-label={`Photo ${i + 1} of ${urls.length}`}
                className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${
                  i === active ? "border-slate-900" : "border-transparent"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
