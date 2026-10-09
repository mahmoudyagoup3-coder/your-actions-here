import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, MaterialCard } from "@/components/material-card";
import { supabase } from "@/integrations/supabase/client";
import {
  KINDS,
  getLevel,
  getStage,
  hasTracks,
  isKindAllowed,
  isTrackKey,
  levelTracks,
  trackName,
  trackSubjects,
  trackKinds,
  subjectDescription,
  type Material,
  type TrackKey,
} from "@/lib/curriculum";

export const Route = createFileRoute("/stage/$stage/$level")({
  validateSearch: (search: Record<string, unknown>): { track?: TrackKey } =>
    isTrackKey(search["track"]) ? { track: search["track"] } : {},
  loader: ({ params }) => {
    const stage = getStage(params.stage);
    const level = getLevel(params.stage, params.level);
    if (!stage || !level) throw notFound();
    return { stageName: stage.name, levelName: level.name };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "المحتوى غير متاح | مكتبة اليعقوبي" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `${loaderData.levelName} — ${loaderData.stageName} | مكتبة اليعقوبي`;
    const description = `كتب ومذكرات وأوراق عمل وحصص ${loaderData.levelName} في ${loaderData.stageName} جاهزة للفتح والتنزيل.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: LevelPage,
});

function LevelPage() {
  const { stage: stageKey, level: levelKey } = Route.useParams();
  const stage = getStage(stageKey)!;
  const level = getLevel(stageKey, levelKey)!;
  const { track } = Route.useSearch();
  const splitCurriculum = hasTracks(stageKey, levelKey);
  const tracks = levelTracks(stageKey, levelKey);
  const [tab, setTab] = useState<string>("all");
  const [subject, setSubject] = useState<string>("all");
  const [term, setTerm] = useState("");
  const availableKinds = trackKinds(stageKey, levelKey, track);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["materials", stageKey, levelKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("library_materials")
        .select("*")
        .eq("stage", stageKey)
        .eq("level", levelKey)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Material[];
    },
  });

  const subjects = useMemo(
    () => (splitCurriculum && !track ? [] : trackSubjects(stageKey, levelKey, track)),
    [stageKey, levelKey, track, splitCurriculum],
  );

  const filtered = useMemo(() => {
    const q = term.trim();
    return (data ?? []).filter((m) => {
      if (!isKindAllowed(stageKey, levelKey, m.kind, track)) return false;
      if (splitCurriculum && track && (m.curriculum_type ?? "new") !== track) return false;
      if (tab !== "all" && m.kind !== tab) return false;
      if (subject !== "all" && m.subject !== subject) return false;
      if (q && !`${m.title} ${m.subject} ${m.description ?? ""}`.includes(q)) return false;
      return true;
    });
  }, [data, tab, subject, term, stageKey, levelKey, splitCurriculum, track]);

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
            <span>{level.name}</span>
          </nav>
          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">{level.name}</h1>
          <p className="mt-2 text-sm text-primary-foreground/85">{stage.name}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {KINDS.filter((k) => availableKinds.includes(k.key)).map((k) => (
              <span key={k.key} className="rounded-full bg-primary-foreground/15 px-3 py-1">
                {k.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {splitCurriculum ? (
        <section className="mx-auto max-w-4xl px-4 pt-12">
          <h2 className="text-xl font-extrabold">اختر المنهج الدراسي</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            ينقسم {level.name} إلى منهجين، اختر المنهج الخاص بك لعرض مواده.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {tracks.map((t) => (
              <Card
                key={t.key}
                className={`card-lift flex flex-col gap-3 p-6 ${
                  track === t.key ? "border-primary ring-2 ring-primary/40" : ""
                }`}
              >
                <h3 className="text-lg font-bold">{t.name}</h3>
                <p className="text-xs leading-6 text-muted-foreground">
                  {t.subjects.length} مادة دراسية {t.key === "old" ? "مع الكتب." : "مع الكتب وأوراق العمل والحصص."}
                </p>
                <Button
                  asChild
                  variant={track === t.key ? "gold" : "outline"}
                  className="mt-auto w-full"
                >
                  <Link
                    to="/stage/$stage/$level"
                    params={{ stage: stageKey, level: levelKey }}
                    search={{ track: t.key }}
                  >
                    {track === t.key ? "المنهج المعروض" : "عرض مواد هذا المنهج"}
                    <ArrowLeft className="size-4" />
                  </Link>
                </Button>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {!splitCurriculum || track ? (
      <>
      {subjects.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pt-12">
          <h2 className="text-xl font-extrabold">
            المواد الدراسية
            {track ? ` — ${trackName(stageKey, levelKey, track)}` : ""}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            اختر المادة لعرض {track === "old" ? "كتبها." : "صفحتها الخاصة بكل الكتب والمذكرات وأوراق العمل والحصص."}
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((s) => (
              <Card key={s} className="card-lift flex flex-col gap-3 p-5">
                <h3 className="text-base font-bold">{s}</h3>
                <p className="line-clamp-3 text-xs leading-6 text-muted-foreground">
                  {subjectDescription(s)}
                </p>
                <Button asChild variant="gold" size="sm" className="mt-auto w-full">
                  <Link
                    to="/stage/$stage/$level/$subject"
                    params={{ stage: stageKey, level: levelKey, subject: s }}
                    search={track ? { track } : {}}
                  >
                    صفحة المادة
                    <ArrowLeft className="size-4" />
                  </Link>
                </Button>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex-wrap">
              <TabsTrigger value="all">الكل</TabsTrigger>
              {KINDS.filter((k) => availableKinds.includes(k.key)).map((k) => (
                <TabsTrigger key={k.key} value={k.key}>
                  {k.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="ابحث داخل هذا الفصل..."
              className="pr-9"
              maxLength={100}
            />
          </div>
        </div>

        {subjects.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => setSubject("all")} type="button">
              <Badge variant={subject === "all" ? "default" : "outline"} className="cursor-pointer">
                كل المواد
              </Badge>
            </button>
            {subjects.map((s) => (
              <button key={s} onClick={() => setSubject(s)} type="button">
                <Badge variant={subject === s ? "default" : "outline"} className="cursor-pointer">
                  {s}
                </Badge>
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-8">
          {isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-52 rounded-2xl" />
              ))}
            </div>
          ) : isError ? (
            <EmptyState
              title="تعذّر تحميل الملفات"
              hint="تحقق من اتصالك بالإنترنت ثم أعد تحديث الصفحة."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="لا توجد ملفات هنا بعد"
              hint={track === "old" ? "سيتم إضافة الكتب قريبًا من قبل إدارة الموقع." : "سيتم إضافة الكتب والمذكرات وأوراق العمل والحصص قريبًا من قبل إدارة الموقع."}
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((m) => (
                <MaterialCard key={m.id} material={m} />
              ))}
            </div>
          )}
        </div>
      </section>
      </>
      ) : null}
    </div>
  );
}
