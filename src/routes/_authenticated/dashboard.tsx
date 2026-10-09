import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BookOpen,
  FileText,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Plus,
  ScrollText,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { STAGES, kindName, stageName, type Material } from "@/lib/curriculum";

export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });
    const { data: role, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (error || !role) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "لوحة الإحصائيات | مكتبة اليعقوبي" },
      { name: "description", content: "لوحة إحصائيات وتحكم مكتبة اليعقوبي." },
      { property: "og:title", content: "لوحة الإحصائيات | مكتبة اليعقوبي" },
      { property: "og:description", content: "مؤشرات المحتوى والملفات في المكتبة." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

interface Stats {
  total: number;
  byKind: Record<string, number>;
  byStage: Record<string, number>;
  bySubject: { subject: string; count: number }[];
  recent: Material[];
}

const kindMeta: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  book: { label: "كتب", icon: BookOpen, color: "bg-chart-1" },
  note: { label: "مذكرات", icon: FileText, color: "bg-chart-2" },
  worksheet: { label: "أوراق عمل", icon: ScrollText, color: "bg-chart-3" },
  course: { label: "حصص", icon: Video, color: "bg-chart-4" },
};

function DashboardPage() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("library_materials")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      const rows = (data ?? []) as Material[];
      const byKind: Record<string, number> = {};
      const byStage: Record<string, number> = {};
      const bySubject: Record<string, number> = {};

      for (const m of rows) {
        byKind[m.kind] = (byKind[m.kind] ?? 0) + 1;
        byStage[m.stage] = (byStage[m.stage] ?? 0) + 1;
        bySubject[m.subject] = (bySubject[m.subject] ?? 0) + 1;
      }

      return {
        total: rows.length,
        byKind,
        byStage,
        bySubject: Object.entries(bySubject)
          .map(([subject, count]) => ({ subject, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8),
        recent: rows.slice(0, 6),
      };
    },
  });

  const stageChart = STAGES.map((s) => ({
    name: s.shortName,
    count: stats?.byStage[s.key] ?? 0,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <LayoutDashboard className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold">لوحة الإحصائيات</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              نظرة عامة على محتوى مكتبة اليعقوبي وأحدث الملفات المضافة.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/admin">
              <Plus className="size-4" />
              إضافة ملف
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Layers}
              label="إجمالي الملفات"
              value={stats?.total ?? 0}
              color="bg-primary"
            />
            <StatCard
              icon={BookOpen}
              label="الكتب"
              value={stats?.byKind["book"] ?? 0}
              color="bg-chart-1"
            />
            <StatCard
              icon={FileText}
              label="المذكرات"
              value={stats?.byKind["note"] ?? 0}
              color="bg-chart-2"
            />
            <StatCard
              icon={GraduationCap}
              label="أوراق العمل + الحصص"
              value={(stats?.byKind["worksheet"] ?? 0) + (stats?.byKind["course"] ?? 0)}
              color="bg-chart-3"
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="text-lg font-bold">توزيع الملفات حسب المرحلة</h2>
              <div className="mt-4 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageChart} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number) => [`${value} ملف`, "العدد"]}
                      contentStyle={{ borderRadius: 12 }}
                    />
                    <Bar dataKey="count" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="text-lg font-bold">توزيع الملفات حسب النوع</h2>
              <div className="mt-6 space-y-4">
                {Object.entries(kindMeta).map(([key, meta]) => {
                  const count = stats?.byKind[key] ?? 0;
                  const percent = stats?.total ? Math.round((count / stats.total) * 100) : 0;
                  const Icon = meta.icon;
                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 font-medium">
                          <Icon className="size-4 text-muted-foreground" />
                          {meta.label}
                        </div>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${meta.color}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <h2 className="text-lg font-bold">آخر الملفات المضافة</h2>
              <div className="mt-4 divide-y divide-border">
                {(stats?.recent.length ?? 0) === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    لا توجد ملفات مضافة بعد.
                  </p>
                ) : (
                  stats?.recent.map((m) => (
                    <div key={m.id} className="flex items-center justify-between py-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{m.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {stageName(m.stage)} · {m.subject} · {kindName(m.kind)}
                        </p>
                      </div>
                      <Badge variant="outline">{kindName(m.kind)}</Badge>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="text-lg font-bold">أكثر المواد محتوى</h2>
              <div className="mt-4 space-y-3">
                {(stats?.bySubject.length ?? 0) === 0 ? (
                  <p className="text-center text-sm text-muted-foreground">لا توجد بيانات بعد.</p>
                ) : (
                  stats?.bySubject.map((item, idx) => (
                    <div key={item.subject} className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {idx + 1}. {item.subject}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        {item.count}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card className="card-lift flex items-center gap-4 p-5">
      <span className={`flex size-12 items-center justify-center rounded-2xl text-primary-foreground ${color}`}>
        <Icon className="size-6" />
      </span>
      <div>
        <div className="text-3xl font-extrabold">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </Card>
  );
}
