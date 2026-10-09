import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState, MaterialCard } from "@/components/material-card";
import { supabase } from "@/integrations/supabase/client";
import { STAGES, getLevel, isKindAllowed, type Material } from "@/lib/curriculum";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "البحث في الملفات | مكتبة اليعقوبي" },
      {
        name: "description",
        content: "ابحث في جميع الكتب والمذكرات الدراسية المتاحة على مكتبة اليعقوبي حسب العنوان أو المادة.",
      },
      { property: "og:title", content: "البحث في الملفات | مكتبة اليعقوبي" },
      {
        property: "og:description",
        content: "ابحث بسرعة عن أي كتاب أو مذكرة دراسية بصيغة PDF.",
      },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [term, setTerm] = useState("");
  const [stage, setStage] = useState<string>("all");
  const [kind, setKind] = useState<string>("all");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["all-materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("library_materials")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Material[];
    },
  });

  const results = useMemo(() => {
    const q = term.trim();
    return (data ?? []).filter((m) => {
      // Skip records pointing at levels/sections that no longer exist publicly.
      if (!getLevel(m.stage, m.level)) return false;
      if (!isKindAllowed(m.stage, m.level, m.kind)) return false;
      if (stage !== "all" && m.stage !== stage) return false;
      if (kind !== "all" && m.kind !== kind) return false;
      if (q && !`${m.title} ${m.subject} ${m.description ?? ""}`.includes(q)) return false;
      return true;
    });
  }, [data, term, stage, kind]);

  return (
    <div>
      <section className="side-page-hero relative overflow-hidden text-primary-foreground">
        <div className="side-page-sheen absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-4 py-14 text-center">
          <h1 className="text-3xl font-extrabold sm:text-4xl">ابحث في مكتبة الملفات</h1>
          <p className="mt-3 text-sm text-primary-foreground/85">
            اكتب اسم الكتاب أو المذكرة أو المادة للعثور على ما تحتاجه.
          </p>
          <div className="relative mx-auto mt-7 max-w-xl">
            <SearchIcon className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="مثال: الرياضيات، مذكرة اللغة العربية..."
              className="h-12 bg-card pr-10 text-foreground"
              maxLength={100}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">المرحلة:</span>
          <button type="button" onClick={() => setStage("all")}>
            <Badge variant={stage === "all" ? "default" : "outline"} className="cursor-pointer">
              الكل
            </Badge>
          </button>
          {STAGES.map((s) => (
            <button key={s.key} type="button" onClick={() => setStage(s.key)}>
              <Badge variant={stage === s.key ? "default" : "outline"} className="cursor-pointer">
                {s.shortName}
              </Badge>
            </button>
          ))}
          <span className="ms-4 text-sm font-semibold">النوع:</span>
          {[
            { k: "all", n: "الكل" },
            { k: "book", n: "كتب" },
            { k: "note", n: "مذكرات" },
            { k: "worksheet", n: "أوراق عمل" },
            { k: "course", n: "حصص" },
          ].map((o) => (
            <button key={o.k} type="button" onClick={() => setKind(o.k)}>
              <Badge variant={kind === o.k ? "default" : "outline"} className="cursor-pointer">
                {o.n}
              </Badge>
            </button>
          ))}
        </div>

        <p className="mt-6 text-sm text-muted-foreground">عدد النتائج: {results.length}</p>

        <div className="mt-4">
          {isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-52 rounded-2xl" />
              ))}
            </div>
          ) : isError ? (
            <EmptyState title="تعذّر تنفيذ البحث" hint="أعد المحاولة بعد قليل." />
          ) : results.length === 0 ? (
            <EmptyState
              title="لا توجد نتائج مطابقة"
              hint="جرّب كلمات بحث أخرى أو غيّر عوامل التصفية."
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((m) => (
                <MaterialCard key={m.id} material={m} showLocation />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
