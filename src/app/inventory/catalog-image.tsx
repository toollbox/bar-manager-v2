"use client";

import { Camera, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { updateCatalogImage } from "@/app/inventory/actions";
import { getStorageImageUrl } from "@/lib/catalog-images";
import { createClient } from "@/lib/supabase/client";

const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
]);

export function CatalogImage({
  organizationId,
  entityType,
  entityId,
  currentPath,
  imageUrl,
  fallbackUrl,
  alt,
  compact = false,
  canUpload = true,
}: {
  organizationId: string;
  entityType: "ingredients" | "products" | "cocktails";
  entityId: string;
  currentPath?: string | null;
  imageUrl?: string | null;
  fallbackUrl: string;
  alt: string;
  compact?: boolean;
  canUpload?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const src =
    (currentPath && getStorageImageUrl(currentPath)) || imageUrl || fallbackUrl;

  async function upload(file?: File) {
    if (!file) return;
    const extension = allowedTypes.get(file.type);

    if (!extension) {
      setError("Choose a JPG, PNG, WebP, or AVIF image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be 5 MB or smaller.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
    const supabase = createClient();
    const path = `${organizationId}/${entityType}/${entityId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("catalog-images")
      .upload(path, file, {
        cacheControl: "31536000",
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      setError("Upload failed. Please try another image.");
      setUploading(false);
      return;
    }

    const result = await updateCatalogImage(entityType, entityId, path);
    if (result.error) {
      await supabase.storage.from("catalog-images").remove([path]);
      setError(result.error);
      setUploading(false);
      return;
    }

    if (currentPath) {
      await supabase.storage.from("catalog-images").remove([currentPath]);
    }

    setUploading(false);
    router.refresh();
    } catch {
      setError("Upload could not finish. Refresh to check the picture and try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={compact ? "flex items-center gap-3" : "space-y-3"}>
      <div
        aria-label={alt}
        className={`relative overflow-hidden bg-stone-100 ${compact ? "size-12 shrink-0 rounded-xl" : "aspect-[4/3] w-full rounded-2xl"}`}
        role="img"
        style={{
          backgroundImage: `linear-gradient(to top, rgba(28,25,23,.12), transparent 55%), url("${src.replaceAll('"', "%22")}")`,
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        {uploading ? (
          <span className="absolute inset-0 grid place-items-center bg-stone-950/55 text-white">
            <LoaderCircle className="animate-spin" size={20} />
          </span>
        ) : null}
      </div>
      {canUpload ? (
        <div className={compact ? "min-w-0" : ""}>
          <input
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              void upload(file);
            }}
            ref={inputRef}
            type="file"
          />
          <button
            className={`${compact ? "text-xs" : "w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"} inline-flex items-center justify-center gap-1.5 font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-60`}
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            <Camera size={compact ? 14 : 16} />{" "}
            {currentPath ? "Replace" : "Upload image"}
          </button>
          {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
