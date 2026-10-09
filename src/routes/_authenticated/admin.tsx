import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  FilePlus2,
  Loader2,
  LogOut,
  Pencil,
  ShieldAlert,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/material-card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  STAGES,
  SUBJECTS,
  levelAllSubjects,
  stageAllSubjects,

  isSubjectAllowed,
  hasTracks,
  isSubjectAllowedInTrack,
  levelTracks,
  trackSubjects,
  trackKinds,
  formatSize,
  getStage,
  KINDS,
  UNITS,
  isKindAllowed,
  kindName,
  type KindKey,
  levelName,
  stageName,
  type Material,
} from "@/lib/curriculum";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });
    const { data: role, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (error || !role) {
      throw redirect({ to: "/" });
    }

  },
  head: () => ({
    meta: [
      { title: "لوحة التحكم | مكتبة اليعقوبي" },
      { name: "description", content: "لوحة إدارة الكتب والمذكرات في مكتبة اليعقوبي." },
      { property: "og:title", content: "لوحة التحكم | مكتبة اليعقوبي" },
      { property: "og:description", content: "إدارة محتوى مكتبة اليعقوبي." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const materialSchema = z.object({
  title: z.string().trim().min(2, "العنوان قصير جدًا").max(150, "العنوان طويل جدًا"),
  description: z.string().trim().max(600, "الوصف طويل جدًا").optional(),
  stage: z.string().min(1, "اختر المرحلة"),
  level: z.string().min(1, "اختر الفصل أو الصف"),
  subject: z.string().min(1, "اختر المادة"),
  curriculumType: z.string().optional(),
  kind: z.enum(["book", "note", "worksheet", "course"]),
  unit: z.string().trim().max(60).optional(),
  videoUrl: z.string().trim().max(500).optional(),
});

const MAX_FILE_MB = 25;

interface FormState {
  id?: string;
  title: string;
  description: string;
  stage: string;
  level: string;
  subject: string;
  curriculumType: string;
  kind: KindKey;
  unit: string;
  videoUrl: string;
  currentPath?: string | undefined;
  currentName?: string | null | undefined;
}

const emptyForm: FormState = {
  title: "",
  description: "",
  stage: "",
  level: "",
  subject: "",
  curriculumType: "",
  kind: "book",
  unit: "",
  videoUrl: "",
};

function AdminPage() {
  const { isAdmin, loading, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null);
  const [filterStage, setFilterStage] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterKind, setFilterKind] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-materials"],
    enabled: isAdmin,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("library_materials")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return (data ?? []) as Material[];
      } catch (err) {
        toast.error(
          err instanceof Error ? `تعذّر تحميل الملفات: ${err.message}` : "تعذّر تحميل الملفات",
        );
        throw err;
      }
    },
  });

  const filterStageLevels = useMemo(
    () => (filterStage === "all" ? [] : (getStage(filterStage)?.levels ?? [])),
    [filterStage],
  );

  const filterSubjects = useMemo<string[]>(() => {
    if (filterStage !== "all" && filterLevel !== "all") {
      return levelAllSubjects(filterStage, filterLevel);
    }
    if (filterStage !== "all") {
      return stageAllSubjects(filterStage);
    }
    return [...SUBJECTS];
  }, [filterStage, filterLevel]);


  useEffect(() => {
    if (filterSubject !== "all" && !filterSubjects.includes(filterSubject)) {
      setFilterSubject("all");
    }
  }, [filterSubjects, filterSubject]);

  const rows = useMemo(() => {
    const q = search.trim();
    return (data ?? []).filter((m) => {
      if (filterStage !== "all" && m.stage !== filterStage) return false;
      if (filterLevel !== "all" && m.level !== filterLevel) return false;
      if (filterKind !== "all" && m.kind !== filterKind) return false;
      if (filterSubject !== "all" && m.subject !== filterSubject) return false;
      if (q && !`${m.title} ${m.subject} ${m.description ?? ""}`.includes(q)) return false;
      return true;
    });
  }, [data, filterStage, filterLevel, filterKind, filterSubject, search]);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  };

  const openCreate = () => {
    setForm(emptyForm);
    setFile(null);
    setDialogOpen(true);
  };

  const openEdit = (m: Material) => {
    setForm({
      id: m.id,
      title: m.title,
      description: m.description ?? "",
      stage: m.stage,
      level: m.level,
      subject: m.subject,
      curriculumType: m.curriculum_type ?? "",
      kind: (m.kind as KindKey) ?? "book",
      unit: m.unit ?? "",
      videoUrl: m.video_url ?? "",
      currentPath: m.file_path ?? undefined,
      currentName: m.file_name,
    });
    setFile(null);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = materialSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");
      return;
    }
    if (
      !isKindAllowed(
        parsed.data.stage,
        parsed.data.level,
        parsed.data.kind,
        parsed.data.curriculumType,
      )
    ) {
      toast.error("هذا النوع غير متاح لهذا الصف.");
      return;
    }
    const splitCurriculum = hasTracks(parsed.data.stage, parsed.data.level);
    if (splitCurriculum && !parsed.data.curriculumType) {
      toast.error("يرجى اختيار المنهج الجديد أو القديم.");
      return;
    }
    if (
      splitCurriculum
        ? !isSubjectAllowedInTrack(
            parsed.data.stage,
            parsed.data.level,
            parsed.data.curriculumType,
            parsed.data.subject,
          )
        : !isSubjectAllowed(parsed.data.stage, parsed.data.level, parsed.data.subject)
    ) {
      toast.error("هذه المادة غير متاحة لهذا الصف.");
      return;
    }
    if (parsed.data.kind === "course") {
      if (!form.videoUrl.trim()) {
        toast.error("يرجى إدخال رابط الفيديو للحصة");
        return;
      }
      if (!/^https?:\/\//i.test(form.videoUrl.trim())) {
        toast.error("رابط الفيديو يجب أن يبدأ بـ http أو https");
        return;
      }
    } else if (!form.id && !file) {
      toast.error("يرجى اختيار ملف PDF");
      return;
    }
    if (parsed.data.kind === "worksheet" && !form.unit.trim()) {
      toast.error("يرجى اختيار الوحدة الدراسية لورقة العمل");
      return;
    }
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("الملف يجب أن يكون بصيغة PDF");
        return;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`حجم الملف يجب ألا يتجاوز ${MAX_FILE_MB} ميجابايت`);
        return;
      }
    }

    setSaving(true);
    try {
      let filePath: string | undefined;
      if (file) {
        const trackPath = form.curriculumType ? `/${form.curriculumType}` : "";
        const path = `${form.stage}/${form.level}${trackPath}/${crypto.randomUUID()}.pdf`;
        const { error: upErr } = await supabase.storage
          .from("materials")
          .upload(path, file, { contentType: "application/pdf", upsert: false });
        if (upErr) throw new Error(`تعذّر رفع الملف: ${upErr.message}`);
        filePath = path;
      }

      const payload = {
        title: parsed.data.title,
        description: parsed.data.description || null,
        stage: parsed.data.stage,
        level: parsed.data.level,
        subject: parsed.data.subject,
        curriculum_type: splitCurriculum ? parsed.data.curriculumType || null : null,
        kind: parsed.data.kind,
        unit: parsed.data.kind === "worksheet" ? form.unit.trim() : null,
        video_url: parsed.data.kind === "course" ? form.videoUrl.trim() : null,
        ...(filePath
          ? { file_path: filePath, file_name: file?.name ?? null, file_size: file?.size ?? null }
          : {}),
      };

      if (form.id) {
        const { error } = await supabase.from("library_materials").update(payload).eq("id", form.id);
        if (error) {
          if (filePath) await supabase.storage.from("materials").remove([filePath]);
          throw new Error(error.message);
        }
        if (filePath && form.currentPath && form.currentPath !== filePath) {
          await supabase.storage.from("materials").remove([form.currentPath]);
        }
        toast.success("تم تحديث الملف بنجاح");
      } else {
        const { error } = await supabase
          .from("library_materials")
          .insert({ ...payload, file_path: filePath ?? null, created_by: user?.id ?? null });
        if (error) {
          if (filePath) await supabase.storage.from("materials").remove([filePath]);
          throw new Error(error.message);
        }
        toast.success("تمت إضافة الملف بنجاح");
      }

      setDialogOpen(false);
      setFile(null);
      await queryClient.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    const { error } = await supabase.from("library_materials").delete().eq("id", target.id);
    if (error) {
      toast.error(`تعذّر الحذف: ${error.message}`);
      return;
    }
    if (target.file_path) {
      await supabase.storage.from("materials").remove([target.file_path]);
    }
    toast.success("تم حذف الملف بنجاح");
    await queryClient.invalidateQueries();
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="size-7" />
        </span>
        <h1 className="mt-4 text-xl font-extrabold">لا تملك صلاحية الوصول</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          هذه الصفحة مخصصة لمدير الموقع فقط.
        </p>
        <Button className="mt-6" onClick={signOut}>
          تسجيل الخروج
        </Button>
      </div>
    );
  }

  const currentStage = getStage(form.stage);
  const stageLevels = currentStage?.levels ?? [];
  const levelLabel = currentStage?.levelLabel ?? "الصف";
  const formTracks = form.stage && form.level ? levelTracks(form.stage, form.level) : [];
  const formSubjects =
    form.stage && form.level && (formTracks.length === 0 || form.curriculumType)
      ? trackSubjects(form.stage, form.level, form.curriculumType)
      : [];
  const formKinds = form.stage && form.level
    ? trackKinds(form.stage, form.level, form.curriculumType)
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">لوحة التحكم</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            إدارة الكتب والمذكرات الظاهرة للطلاب — {user?.email}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openCreate}>
            <FilePlus2 className="size-4" />
            إضافة ملف
          </Button>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="size-4" />
            خروج
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Select
          value={filterStage}
          onValueChange={(v) => {
            setFilterStage(v);
            setFilterLevel("all");
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="كل المراحل" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المراحل</SelectItem>
            {STAGES.map((s) => (
              <SelectItem key={s.key} value={s.key}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filterLevel}
          onValueChange={setFilterLevel}
          disabled={filterStage === "all"}
        >
          <SelectTrigger>
            <SelectValue placeholder="كل الفصول" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الفصول/الصفوف</SelectItem>
            {filterStageLevels.map((l) => (
              <SelectItem key={l.key} value={l.key}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterKind} onValueChange={setFilterKind}>
          <SelectTrigger>
            <SelectValue placeholder="كل الأنواع" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأنواع</SelectItem>
            <SelectItem value="book">كتب</SelectItem>
            <SelectItem value="note">مذكرات</SelectItem>
            <SelectItem value="worksheet">أوراق عمل</SelectItem>
            <SelectItem value="course">حصص</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger>
            <SelectValue placeholder="كل المواد" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المواد</SelectItem>
            {filterSubjects.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالعنوان أو المادة..."
          maxLength={100}
        />
      </div>

      <div className="mt-6">
        {isLoading ? (
          <Skeleton className="h-56 rounded-2xl" />
        ) : isError ? (
          <EmptyState
            title="تعذّر تحميل الملفات"
            hint="تحقق من اتصالك بالإنترنت ثم أعد تحديث الصفحة."
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title={
              (data ?? []).length === 0 ? "لا توجد ملفات بعد" : "لا توجد نتائج مطابقة للتصفية"
            }
            hint={
              (data ?? []).length === 0
                ? "اضغط على «إضافة ملف» لرفع أول كتاب أو مذكرة."
                : "جرّب تغيير المرحلة أو المادة أو كلمة البحث."
            }
          />
        ) : (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              عدد الملفات المعروضة: {rows.length} من {(data ?? []).length}
            </p>
            <div className="grid gap-4">
              {rows.map((m) => (
                <Card key={m.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">{m.title}</h3>
                      <Badge variant={m.kind === "book" ? "default" : "secondary"}>
                        {kindName(m.kind)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {stageName(m.stage)} · {levelName(m.stage, m.level)} · {m.subject} ·{" "}
                      {formatSize(m.file_size)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(m)}>
                      <Pencil className="size-4" />
                      تعديل
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(m)}>
                      <Trash2 className="size-4" />
                      حذف
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>{form.id ? "تعديل الملف" : "إضافة ملف جديد"}</DialogTitle>
            <DialogDescription>
              اختر المرحلة والفصل والمادة، ثم ارفع ملف PDF ليظهر مباشرة للطلاب.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">عنوان الملف</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="مثال: كتاب الرياضيات — الفصل الأول"
                maxLength={150}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>المرحلة</Label>
                <Select
                  value={form.stage}
                  onValueChange={(v) => {
                    setForm({
                      ...form,
                      stage: v,
                      level: "",
                      subject: "",
                      curriculumType: "",
                      kind: "book",
                      unit: "",
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المرحلة الدراسية" />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s.key} value={s.key}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{levelLabel}</Label>
                <Select
                  value={form.level}
                  disabled={!form.stage}
                  onValueChange={(v) => {
                    setForm({
                      ...form,
                      level: v,
                      subject: "",
                      curriculumType: "",
                      kind: isKindAllowed(form.stage, v, form.kind) ? form.kind : "book",
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        form.stage ? `اختر ${levelLabel}` : "اختر المرحلة الدراسية أولاً"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {stageLevels.map((l) => (
                      <SelectItem key={l.key} value={l.key}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formTracks.length > 0 ? (
                <div className="space-y-2">
                  <Label>المنهج</Label>
                  <Select
                    value={form.curriculumType}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        curriculumType: v,
                        subject: "",
                        kind: v === "old" ? "book" : form.kind,
                        unit: v === "old" ? "" : form.unit,
                        videoUrl: v === "old" ? "" : form.videoUrl,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المنهج (جديد / قديم)" />
                    </SelectTrigger>
                    <SelectContent>
                      {formTracks.map((t) => (
                        <SelectItem key={t.key} value={t.key}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label>المادة</Label>
                <Select
                  value={form.subject}
                  disabled={formSubjects.length === 0}
                  onValueChange={(v) => setForm({ ...form, subject: v })}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !form.stage
                          ? "اختر المرحلة الدراسية أولاً"
                          : !form.level
                            ? `اختر ${levelLabel} أولاً`
                            : formTracks.length > 0 && !form.curriculumType
                              ? "اختر المنهج أولاً"
                              : "اختر المادة"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {formSubjects.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formSubjects.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    عدد المواد المتاحة: {formSubjects.length}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>النوع</Label>
                <Select
                  value={form.kind}
                  disabled={!form.level}
                  onValueChange={(v) => setForm({ ...form, kind: v as KindKey })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر النوع" />
                  </SelectTrigger>
                  <SelectContent>
                    {KINDS.filter((k) => formKinds.includes(k.key)).map((k) => (
                      <SelectItem key={k.key} value={k.key}>
                        {kindName(k.key)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>


            {form.kind === "worksheet" ? (
              <div className="space-y-2">
                <Label>وحدة الكتاب</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الوحدة" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {form.kind === "course" ? (
              <div className="space-y-2">
                <Label htmlFor="video">رابط الحصة (فيديو)</Label>
                <Input
                  id="video"
                  value={form.videoUrl}
                  onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                  placeholder="https://youtube.com/..."
                  maxLength={500}
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">
                  ضع رابط الفيديو (يوتيوب أو غيره). رفع ملف PDF اختياري للحصص.
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="desc">وصف مختصر (اختياري)</Label>
              <Textarea
                id="desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                maxLength={600}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">
                ملف PDF{" "}
                {form.kind === "course"
                  ? "(اختياري)"
                  : form.id
                    ? "(اتركه فارغًا للإبقاء على الملف الحالي)"
                    : ""}
              </Label>
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-3">
                <UploadCloud className="size-5 text-primary" />
                <Input
                  id="file"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="border-0 p-0 shadow-none"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                الحد الأقصى لحجم الملف {MAX_FILE_MB} ميجابايت.
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                {form.id ? "حفظ التعديلات" : "إضافة الملف"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف «{deleteTarget?.title}» نهائيًا مع ملفه. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
