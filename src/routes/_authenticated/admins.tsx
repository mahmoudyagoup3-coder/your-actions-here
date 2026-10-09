import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { KeyRound, Loader2, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { addAdmin, listAdmins, removeAdmin, resetAdminPassword } from "@/lib/admins.functions";

export const Route = createFileRoute("/_authenticated/admins")({
  beforeLoad: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
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
      { title: "إدارة المشرفين | مكتبة اليعقوبي" },
      {
        name: "description",
        content: "لوحة إدارة مشرفي مكتبة اليعقوبي: إضافة مشرف جديد وتغيير كلمات المرور.",
      },
      { property: "og:title", content: "إدارة المشرفين | مكتبة اليعقوبي" },
      { property: "og:description", content: "إدارة صلاحيات مشرفي مكتبة اليعقوبي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminsPage,
});

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "حدث خطأ غير متوقع";
}

function AdminsPage() {
  const queryClient = useQueryClient();
  const fetchAdmins = useServerFn(listAdmins);
  const createAdmin = useServerFn(addAdmin);
  const dropAdmin = useServerFn(removeAdmin);
  const changePassword = useServerFn(resetAdminPassword);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const admins = useQuery({
    queryKey: ["admins"],
    queryFn: () => fetchAdmins(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admins"] });

  const addMutation = useMutation({
    mutationFn: () =>
      createAdmin({ data: { email, password: password.trim() ? password : undefined } }),
    onSuccess: () => {
      toast.success("تمت إضافة المشرف بنجاح");
      setEmail("");
      setPassword("");
      void invalidate();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => dropAdmin({ data: { userId } }),
    onSuccess: () => {
      toast.success("تمت إزالة المشرف");
      void invalidate();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const passwordMutation = useMutation({
    mutationFn: (userId: string) => changePassword({ data: { userId, password: newPassword } }),
    onSuccess: () => {
      toast.success("تم تغيير كلمة المرور");
      setResetFor(null);
      setNewPassword("");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <main className="container mx-auto px-4 py-10" dir="rtl">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-primary">
            <ShieldCheck className="h-7 w-7" />
            إدارة المشرفين
          </h1>
          <p className="mt-2 text-muted-foreground">
            أضف مشرفين جدد، أو غيّر كلمة مرور أي مشرف، أو أزل صلاحياته.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/admin">لوحة التحكم</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard">لوحة الإحصائيات</Link>
          </Button>
        </div>
      </header>

      <Card className="mb-8 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
          <UserPlus className="h-5 w-5" />
          إضافة مشرف جديد
        </h2>
        <form
          className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            addMutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="admin-email">البريد الإلكتروني</Label>
            <Input
              id="admin-email"
              type="email"
              required
              dir="ltr"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">كلمة المرور (لحساب جديد)</Label>
            <Input
              id="admin-password"
              type="text"
              dir="ltr"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="8 أحرف على الأقل"
            />
          </div>
          <Button type="submit" disabled={addMutation.isPending}>
            {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "إضافة"}
          </Button>
        </form>
        <p className="mt-3 text-sm text-muted-foreground">
          إذا كان البريد مسجلًا مسبقًا فسيتم منحه صلاحية الإشراف مباشرة، وإذا كتبت كلمة مرور فسيتم
          تعيينها له.
        </p>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">المشرفون الحاليون</h2>
        {admins.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : admins.isError ? (
          <p className="text-destructive">{errorMessage(admins.error)}</p>
        ) : (
          <ul className="space-y-3">
            {(admins.data ?? []).map((row) => (
              <li key={row.userId} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium" dir="ltr">
                      {row.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      آخر دخول:{" "}
                      {row.lastSignInAt
                        ? new Date(row.lastSignInAt).toLocaleString("ar-EG")
                        : "لم يسجّل الدخول بعد"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {row.isSelf ? <Badge variant="secondary">أنت</Badge> : null}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setResetFor(resetFor === row.userId ? null : row.userId);
                        setNewPassword("");
                      }}
                    >
                      <KeyRound className="ml-1 h-4 w-4" />
                      كلمة المرور
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={row.isSelf || removeMutation.isPending}
                      onClick={() => {
                        if (window.confirm(`هل تريد إزالة صلاحية الإشراف عن ${row.email}؟`)) {
                          removeMutation.mutate(row.userId);
                        }
                      }}
                    >
                      <Trash2 className="ml-1 h-4 w-4" />
                      إزالة
                    </Button>
                  </div>
                </div>
                {resetFor === row.userId ? (
                  <form
                    className="mt-4 flex flex-wrap items-end gap-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      passwordMutation.mutate(row.userId);
                    }}
                  >
                    <div className="min-w-[220px] flex-1 space-y-2">
                      <Label htmlFor={`pw-${row.userId}`}>كلمة مرور جديدة</Label>
                      <Input
                        id={`pw-${row.userId}`}
                        type="text"
                        dir="ltr"
                        required
                        minLength={8}
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                      />
                    </div>
                    <Button type="submit" disabled={passwordMutation.isPending}>
                      {passwordMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "حفظ"
                      )}
                    </Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
