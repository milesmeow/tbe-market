"use client";

import { startTransition, useActionState, useState } from "react";

import { MAX_IMAGES_PER_LISTING } from "@/lib/config";
import { compressImage } from "@/lib/image";
import {
  FormError,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "@/components/ui";
import type { ListingFormState } from "@/app/(app)/listings/actions";

type Action = (
  prev: ListingFormState,
  formData: FormData,
) => Promise<ListingFormState>;

export function ListingForm({
  action,
  submitLabel,
  defaults,
  photosRequired,
  photosLabel = "Photos",
}: {
  action: Action;
  submitLabel: string;
  defaults?: { id?: string; title?: string; description?: string; price?: string };
  photosRequired: boolean;
  photosLabel?: string;
}) {
  const [state, formAction, isPending] = useActionState<
    ListingFormState,
    FormData
  >(action, {});
  const [previews, setPreviews] = useState<string[]>([]);
  const [badPreviews, setBadPreviews] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [localError, setLocalError] = useState<string>();
  // Pre-check "Free" when editing an item already priced at 0.
  const [isFree, setIsFree] = useState(
    defaults?.price != null && Number(defaults.price) === 0,
  );

  const busy = processing || isPending;

  function onPickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(
      0,
      MAX_IMAGES_PER_LISTING,
    );
    setBadPreviews(new Set());
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  }

  // Intercept submit so we can compress images in the browser before they're
  // sent through the Server Action (keeps the request small).
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(undefined);

    const formData = new FormData(e.currentTarget);
    const rawFiles = formData
      .getAll("images")
      .filter((v): v is File => v instanceof File && v.size > 0)
      .slice(0, MAX_IMAGES_PER_LISTING);

    if (photosRequired && rawFiles.length === 0) {
      setLocalError("Please add at least one photo.");
      return;
    }

    setProcessing(true);
    try {
      formData.delete("images");
      for (const file of rawFiles) {
        formData.append("images", await compressImage(file));
      }
    } finally {
      setProcessing(false);
    }

    // Dispatch must run inside a transition so isPending tracks correctly.
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {defaults?.id && <input type="hidden" name="id" value={defaults.id} />}

      <div>
        <label htmlFor="title" className={labelClass}>
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={120}
          defaultValue={defaults?.title}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="price" className={labelClass}>
          Price (USD)
        </label>
        <input
          id="price"
          name="price"
          type="text"
          inputMode="decimal"
          required={!isFree}
          disabled={isFree}
          placeholder={isFree ? "Free" : "0.00"}
          defaultValue={defaults?.price}
          className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-400`}
        />
        {/* The box stays 16px; the label wrapper is what makes the target 44px
            tall, so the whole row is tappable on a phone. */}
        <label className="mt-1 flex min-h-11 touch-manipulation items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            name="free"
            checked={isFree}
            onChange={(e) => setIsFree(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          This item is free
        </label>
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={2000}
          defaultValue={defaults?.description}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="images" className={labelClass}>
          {photosLabel}{" "}
          <span className="font-normal text-slate-400">
            (up to {MAX_IMAGES_PER_LISTING})
          </span>
        </label>
        <input
          id="images"
          name="images"
          type="file"
          accept="image/*"
          multiple
          required={photosRequired}
          onChange={onPickImages}
          className="block w-full text-sm text-slate-600 file:mr-3 file:min-h-11 file:touch-manipulation file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:text-white hover:file:bg-slate-700"
        />
        {previews.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {previews.map((src) =>
              badPreviews.has(src) ? (
                // HEIC and other non-web formats can't preview locally; they're
                // converted to JPEG on upload.
                <div
                  key={src}
                  className="flex h-20 w-20 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-1 text-center text-[10px] leading-tight text-slate-500"
                >
                  Photo ready ✓
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={src}
                  alt="preview"
                  onError={() =>
                    setBadPreviews((prev) => new Set(prev).add(src))
                  }
                  className="h-20 w-20 rounded-lg border border-slate-200 object-cover"
                />
              ),
            )}
          </div>
        )}
      </div>

      <FormError message={localError ?? state.error} />

      {/* Full-width on a phone (it's the only action on the screen), natural
          width once there's room beside it. */}
      <button
        type="submit"
        disabled={busy}
        className={`w-full sm:w-auto ${primaryButtonClass}`}
      >
        {processing ? "Processing photos…" : isPending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
