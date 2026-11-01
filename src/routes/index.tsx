import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookMarked,
  BookOpenText,
  Download,
  GraduationCap,
  Layers,
  Moon,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import heroAsset from "@/assets/hero-sudan-violet-original.png.asset.json";

import { STAGES } from "@/lib/curriculum";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "مكتبة اليعقوبي | كتب ومذكرات دراسية PDF لكل المراحل" },
      {
        name: "description",
        content:
          "حمّل الكتب والمذكرات الدراسية بصيغة PDF للمرحلة الابتدائية والمتوسطة والثانوية مجانًا ومنظّمة حسب الفصل والمادة.",
      },
      { property: "og:title", content: "مكتبة اليعقوبي | مكتبة الكتب والمذكرات الدراسية" },
      {
        property: "og:description",
        content: "مكتبة عربية منظّمة للكتب والمذكرات الدراسية بصيغة PDF لجميع المراحل.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const stageIcons = [BookOpenText, Layers, GraduationCap];

function HomePage() {
  const { data: stats } = useQuery({
    queryKey: ["materials-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("library_materials")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  return (
    <div>
      
      <section className="relative isolate min-h-[min(133vw,760px)] overflow-hidden bg-primary text-primary-foreground md:min-h-[720px] lg:min-h-[780px]">
        <img
          src={heroAsset.url}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full scale-110 object-cover object-center opacity-55 blur-xl"
        />
        <img
          src={heroAsset.url}
          alt="طلاب سودانيون أمام أهرامات السودان ومعالمه التعليمية"
          className="absolute inset-0 size-full object-contain object-center"
          fetchPriority="high"
        />
        <div className="hero-image-overlay absolute inset-0" aria-hidden />
        <div className="relative mx-auto flex min-h-[min(133vw,760px)] max-w-6xl flex-col items-center px-4 py-6 text-center md:min-h-[720px] md:py-8 lg:min-h-[780px]">
          <div className="hero-verse font-diwani mt-14 flex items-center justify-center gap-3 whitespace-nowrap text-xl sm:mt-20 sm:text-2xl">
            <span aria-hidden="true" className="verse-flourish" />
            <span className="verse-text">﴿ وَقُلْ رَبِّ زِدْنِي عِلْمًا ﴾</span>
            <span aria-hidden="true" className="verse-flourish" />
          </div>
          <div className="flex flex-1 flex-col items-center justify-center py-6 md:py-12">
          <div aria-hidden className="mt-6 h-7" />
          <h1 className="verse-card hero-glow -mt-12 mb-16 inline-block max-w-full whitespace-nowrap rounded-3xl px-5 py-3 text-[clamp(1rem,4.4vw,2.15rem)] leading-tight font-extrabold md:-mt-[76px] md:mb-24 sm:px-8 sm:py-5">
            إِلَيْكَ مَكْتَبَتَكَ السُّودَانِيَّةَ الكَامِلَةَ
          </h1>
          <p
            className="hero-word-reveal mt-3 flex flex-wrap justify-center gap-x-1.5 text-sm font-semibold text-primary-foreground/90 sm:text-base"
            aria-label="كُتُبٌ وَمُذَكِّرَاتٌ بِصِيغَةِ PDF"
          >
            {['كُتُبٌ', 'وَمُذَكِّرَاتٌ', 'بِصِيغَةِ', 'PDF'].map((word, index) => (
              <span key={word} aria-hidden="true" style={{ animationDelay: `${index * 0.45}s` }}>
                {word}
              </span>
            ))}
          </p>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-primary-foreground/85 sm:text-base">
            كُلُّ مَا يَحْتَاجُهُ الطَّالِبُ السُّودَانِيُّ فِي مَكَانٍ وَاحِدٍ
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-14 gap-3 rounded-full border-primary-foreground/45 bg-transparent px-10 text-lg font-bold text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link to="/search">
                <Search className="size-4" />
                البحث في الملفات
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="h-14 gap-3 rounded-full bg-laila-accent px-10 text-lg font-bold text-white shadow-soft hover:bg-laila-accent/90"
            >
              <Link to="/laila">
                <Moon className="size-4" />
                غرفة ليلا الذكية
              </Link>
            </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 py-10 sm:grid-cols-3">
        {[
          { icon: BookMarked, label: "ملف متاح للتحميل", value: stats ?? 0 },
          { icon: Layers, label: "مراحل تعليمية", value: STAGES.length },
          {
            icon: GraduationCap,
            label: "فصول وصفوف دراسية",
            value: STAGES.reduce((acc, s) => acc + s.levels.length, 0),
          },
        ].map((item) => (
          <Card key={item.label} className="card-lift flex items-center gap-3 p-5">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <item.icon className="size-5" />
            </span>
            <div>
              <div className="text-2xl font-extrabold">{item.value}</div>
              <div className="text-xs text-muted-foreground">{item.label}</div>
            </div>
          </Card>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold sm:text-3xl">اختر مرحلتك الدراسية</h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            تصفّح الكتب والمذكرات والمواد حسب المرحلة والفصل الدراسي.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {STAGES.map((stage, i) => {
            const Icon = stageIcons[i] ?? BookOpenText;
            return (
              <Card key={stage.key} className="card-lift flex flex-col gap-4 p-6">
                <span className="surface-accent flex size-12 items-center justify-center rounded-2xl text-accent-foreground">
                  <Icon className="size-6" />
                </span>
                <h3 className="text-xl font-bold">{stage.name}</h3>
                <p className="text-sm leading-7 text-muted-foreground">{stage.description}</p>
                <ul className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  {stage.levels.slice(0, 6).map((level) => (
                    <li key={level.key} className="rounded-lg bg-muted px-2 py-1.5 text-center">
                      {level.name}
                    </li>
                  ))}
                </ul>
                <Button asChild variant="gold" className="mt-auto w-full">
                  <Link to="/stage/$stage" params={{ stage: stage.key }}>
                    عرض المرحلة
                    <ArrowLeft className="size-4" />
                  </Link>
                </Button>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="bg-secondary/40 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-extrabold sm:text-3xl">لماذا مكتبة اليعقوبي؟</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: Layers,
                title: "تنظيم دقيق",
                text: "كل ملف مصنّف حسب المرحلة والفصل والمادة ونوعه (كتاب أو مذكرة).",
              },
              {
                icon: Download,
                title: "تنزيل فوري",
                text: "افتح ملف الـ PDF مباشرة في المتصفح أو حمّله على جهازك بضغطة واحدة.",
              },
              {
                icon: Search,
                title: "بحث سريع",
                text: "ابحث بالاسم أو المادة واعثر على ما تريد خلال ثوانٍ.",
              },
            ].map((f) => (
              <Card key={f.title} className="card-lift p-6">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{f.text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
