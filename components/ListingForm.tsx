"use client";

import { useActionState, useState } from "react";

import { MAX_IMAGES_PER_LISTING } from "@/lib/config";
import { compressImage } from "@/lib/image";
import { FormError, inputClass, labelClass } from "@/components/ui";
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
  const [processing, setProcessing] = useState(false);
  const [localError, setLocalError] = useState<string>();

  const busy = processing || isPending;

  function onPickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(
      0,
      MAX_IMAGES_PER_LISTING,
    );
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

    formAction(formData);
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
          required
          placeholder="0.00"
          defaultValue={defaults?.price}
          className={inputClass}
        />
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
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-white hover:file:bg-slate-700"
        />
        {previews.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {previews.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src}
                src={src}
                alt="preview"
                className="h-20 w-20 rounded-lg border border-slate-200 object-cover"
              />
            ))}
          </div>
        )}
      </div>

      <FormError message={localError ?? state.error} />

      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-slate-700 disabled:opacity-50"
      >
        {processing ? "Processing photos…" : isPending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
