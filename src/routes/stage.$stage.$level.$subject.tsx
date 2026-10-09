import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, MaterialCard } from "@/components/material-card";
import { supabase } from "@/integrations/supabase/client";
import {
  KINDS,
  getLevel,
  getStage,
  hasTracks,
  isTrackKey,
  trackName,
  trackKinds,
  subjectDescription,
  type Material,
  type TrackKey,
} from "@/lib/curriculum";

export const Route = createFileRoute("/stage/$stage/$level/$subject")({
  validateSearch: (search: Record<string, unknown>): { track?: TrackKey } =>
    isTrackKey(search["track"]) ? { track: search["track"] } : {},
  loader: ({ params }) => {
    const stage = getStage(params.stage);
    const level = getLevel(params.stage, params.level);
    if (!stage || !level) throw notFound();
    return {
      stageName: stage.name,
      levelName: level.name,
      subject: decodeURIComponent(params.subject),
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "المادة غير متاحة | مكتبة اليعقوبي" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `${loaderData.subject} — ${loaderData.levelName} | مكتبة اليعقوبي`;
    const description = `كتب ومذكرات وأوراق عمل حسب وحدات الكتاب وحصص فيديو لمادة ${loaderData.subject} في ${loaderData.levelName}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: SubjectPage,
});

function SubjectPage() {
  const { stage: stageKey, level: levelKey, subject: rawSubject } = Route.useParams();
  const subject = decodeURIComponent(rawSubject);
  const stage = getStage(stageKey)!;
  const level = getLevel(stageKey, levelKey)!;
  const { track } = Route.useSearch();
  const splitCurriculum = hasTracks(stageKey, levelKey);
  const availableKinds = trackKinds(stageKey, levelKey, track);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["materials", stageKey, levelKey, subject, track ?? null],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("library_materials")
        .select("*")
        .eq("stage", stageKey)
        .eq("level", levelKey)
        .eq("subject", subject)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as Material[];
      if (!splitCurriculum || !track) return rows;
      return rows.filter((m) => (m.curriculum_type ?? "new") === track);
    },
  });

  const byKind = useMemo(() => {
    const map: Record<string, Material[]> = {};
    for (const m of data ?? []) (map[m.kind] ??= []).push(m);
    return map;
  }, [data]);

  const worksheetUnits = useMemo(() => {
    const groups = new Map<string, Material[]>();
    for (const m of byKind["worksheet"] ?? []) {
      const key = m.unit?.trim() || "غير مصنّفة";
      const arr = groups.get(key) ?? [];
      arr.push(m);
      groups.set(key, arr);
    }
    return Array.from(groups.entries());
  }, [byKind]);

  return (
    <div>
      <section className="side-page-hero relative overflow-hidden text-primary-foreground">
        <div className="side-page-sheen absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 py-12">
          <nav className="text-xs text-primary-foreground/75">
            <Link to="/" className="hover:underline">
              الرئيسية
            </Link>
            <span className="mx-2">/</span>
            <Link to="/stage/$stage" params={{ stage: stageKey }} className="hover:underline">
              {stage.name}
            </Link>
            <span className="mx-2">/</span>
            <Link
              to="/stage/$stage/$level"
              params={{ stage: stageKey, level: levelKey }}
              search={track ? { track } : {}}
              className="hover:underline"
            >
              {level.name}
            </Link>
            {track ? (
              <>
                <span className="mx-2">/</span>
                <span>{trackName(stageKey, levelKey, track)}</span>
              </>
            ) : null}
            <span className="mx-2">/</span>
            <span>{subject}</span>
          </nav>
          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">{subject}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-primary-foreground/85">
            {subjectDescription(subject)}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-12">
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            title="تعذّر تحميل المحتوى"
            hint="تحقق من اتصالك بالإنترنت ثم أعد تحديث الصفحة."
          />
        ) : (data ?? []).length === 0 ? (
          <EmptyState
            title={`لا يوجد محتوى في ${subject} بعد`}
            hint={track === "old" ? "سيتم إضافة الكتب قريبًا." : "سيتم إضافة الكتب والمذكرات وأوراق العمل والحصص قريبًا."}
          />
        ) : (
          <>
            {KINDS.filter((k) => k.key !== "worksheet" && availableKinds.includes(k.key)).map((k) => {
              const items = byKind[k.key] ?? [];
              if (items.length === 0) return null;
              return (
                <section key={k.key}>
                  <h2 className="text-xl font-extrabold">{k.name}</h2>
                  <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((m) => (
                      <MaterialCard key={m.id} material={m} />
                    ))}
                  </div>
                </section>
              );
            })}

            {availableKinds.includes("worksheet") && worksheetUnits.length > 0 ? (
              <section>
                <h2 className="text-xl font-extrabold">أوراق العمل حسب وحدات الكتاب</h2>
                <div className="mt-5 space-y-8">
                  {worksheetUnits.map(([unit, items]) => (
                    <div key={unit}>
                      <h3 className="text-base font-bold text-primary">{unit}</h3>
                      <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map((m) => (
                          <MaterialCard key={m.id} material={m} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
