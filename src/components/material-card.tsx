import { useState } from "react";
import { Download, ExternalLink, FileText, Loader2, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  formatSize,
  kindName,
  levelName,
  stageName,
  type Material,
} from "@/lib/curriculum";

async function getSignedUrl(path: string, download?: string) {
  const { data, error } = await supabase.storage
    .from("materials")
    .createSignedUrl(path, 3600, download ? { download } : undefined);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "تعذّر تجهيز رابط الملف");
  }
  return data.signedUrl;
}

export function MaterialCard({
  material,
  showLocation = false,
}: {
  material: Material;
  showLocation?: boolean;
}) {
  const [busy, setBusy] = useState<"open" | "download" | null>(null);
  const isCourse = material.kind === "course";
  const hasFile = Boolean(material.file_path);

  const handle = async (mode: "open" | "download") => {
    if (!material.file_path) return;
    setBusy(mode);
    try {
      const url = await getSignedUrl(
        material.file_path,
        mode === "download" ? (material.file_name ?? `${material.title}.pdf`) : undefined,
      );
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="card-lift flex h-full flex-col gap-4 border-border p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          {isCourse ? <PlayCircle className="size-5" /> : <FileText className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold" title={material.title}>
            {material.title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {material.subject}
            {isCourse && !hasFile ? " · فيديو" : ` · ${formatSize(material.file_size)}`}
          </p>
        </div>
        <Badge variant={material.kind === "book" ? "default" : "secondary"}>
          {kindName(material.kind)}
        </Badge>
      </div>

      {material.unit ? (
        <Badge variant="outline" className="w-fit">
          {material.unit}
        </Badge>
      ) : null}

      {material.description ? (
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
          {material.description}
        </p>
      ) : null}

      {showLocation ? (
        <p className="text-xs text-muted-foreground">
          {stageName(material.stage)} — {levelName(material.stage, material.level)}
        </p>
      ) : null}

      <div className="mt-auto flex gap-2">
        {material.video_url ? (
          <Button asChild className="flex-1" size="sm" variant="gold">
            <a href={material.video_url} target="_blank" rel="noopener noreferrer">
              <PlayCircle className="size-4" />
              مشاهدة الحصة
            </a>
          </Button>
        ) : null}

        {hasFile ? (
          <>
            <Button
              className="flex-1"
              onClick={() => handle("open")}
              disabled={busy !== null}
              size="sm"
              variant={material.video_url ? "outline" : "gold"}
            >
              {busy === "open" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ExternalLink className="size-4" />
              )}
              فتح الملف
            </Button>
            {!material.video_url ? (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handle("download")}
                disabled={busy !== null}
              >
                {busy === "download" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                تنزيل
              </Button>
            ) : null}
          </>
        ) : null}
      </div>
    </Card>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-14 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <FileText className="size-6" />
      </span>
      <h3 className="mt-4 text-base font-bold">{title}</h3>
      {hint ? <p className="mt-2 text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
