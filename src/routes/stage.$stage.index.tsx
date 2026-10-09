import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getStage } from "@/lib/curriculum";

export const Route = createFileRoute("/stage/$stage/")({
  loader: ({ params }) => {
    const stage = getStage(params.stage);
    if (!stage) throw notFound();
    return { stageName: stage.name, stageDescription: stage.description };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "المرحلة غير متاحة | مكتبة اليعقوبي" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `${loaderData.stageName} | مكتبة اليعقوبي`;
    return {
      meta: [
        { title },
        { name: "description", content: loaderData.stageDescription },
        { property: "og:title", content: title },
        { property: "og:description", content: loaderData.stageDescription },
      ],
    };
  },
  component: StagePage,
});

function StagePage() {
  const { stage: stageKey } = Route.useParams();
  const stage = getStage(stageKey)!;

  const { data: counts } = useQuery({
    queryKey: ["stage-counts", stageKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("library_materials")
        .select("level, kind")
        .eq("stage", stageKey);
      if (error) throw error;
      const map: Record<string, { books: number; notes: number }> = {};
      for (const row of data ?? []) {
        const entry = map[row.level] ?? { books: 0, notes: 0 };
        if (row.kind === "note") entry.notes += 1;
        else entry.books += 1;
        map[row.level] = entry;
      }
      return map;
    },
  });

  return (
    <div>
      <section className="side-page-hero relative overflow-hidden text-primary-foreground">
        <div className="side-page-sheen absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 py-14">
          <nav className="text-xs text-primary-foreground/75">
            <Link to="/" className="hover:underline">
              الرئيسية
            </Link>
            <span className="mx-2">/</span>
            <span>{stage.name}</span>
          </nav>
          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">{stage.name}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-8 text-primary-foreground/85 sm:text-base">
            {stage.description}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-xl font-extrabold">
          {stage.key === "preparatory" ? "الفصول الدراسية" : "الصفوف الدراسية"}
        </h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {stage.levels.map((level) => {
            const c = counts?.[level.key];
            return (
              <Card key={level.key} className="card-lift flex flex-col gap-4 p-6">
                <h3 className="text-lg font-bold">{level.name}</h3>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1.5">
                    <BookOpen className="size-3.5" />
                    {c?.books ?? 0} كتاب
                  </span>
                  {level.kinds.includes("note") ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1.5">
                      <FileText className="size-3.5" />
                      {c?.notes ?? 0} مذكرة
                    </span>
                  ) : null}
                </div>
                <Button asChild variant="gold" className="mt-auto w-full">
                  <Link
                    to="/stage/$stage/$level"
                    params={{ stage: stage.key, level: level.key }}
                  >
                    عرض الملفات
                    <ArrowLeft className="size-4" />
                  </Link>
                </Button>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
