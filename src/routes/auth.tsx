import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, LogIn, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { arabicNetworkMessage, withTimeout } from "@/lib/with-timeout";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "دخول المشرفين | مكتبة اليعقوبي" },
      {
        name: "description",
        content: "صفحة تسجيل دخول إدارة مكتبة اليعقوبي لإدارة الكتب والمذكرات الدراسية.",
      },
      { property: "og:title", content: "دخول المشرفين | مكتبة اليعقوبي" },
      {
        property: "og:description",
        content: "دخول آمن لإدارة محتوى مكتبة اليعقوبي.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "يرجى إدخال بريد إلكتروني صحيح" })
    .max(255, { message: "البريد الإلكتروني طويل جدًا" }),
  password: z
    .string()
    .min(8, { message: "كلمة المرور يجب ألا تقل عن 8 أحرف" })
    .max(72, { message: "كلمة المرور طويلة جدًا" }),
});

function AuthPage() {
  const navigate = useNavigate();
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("signin");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setStatusError(null);
    setAdminExists(null);
    void (async () => {
      try {
        const { data, error } = await withTimeout(supabase.rpc("admin_exists"), 10_000);
        if (!active) return;
        if (error) throw error;
        const exists = Boolean(data);
        setAdminExists(exists);
        setTab(exists ? "signin" : "signup");
      } catch (err) {
        if (!active) return;
        setAdminExists(null);
        setTab("signin");
        setStatusError(arabicNetworkMessage(err));
      }
    })();
    return () => {
      active = false;
    };
  }, [reload]);

  const afterAuth = async () => {
    try {
      const { data: claimed } = await withTimeout(supabase.rpc("claim_admin"));
      const { data: userData } = await withTimeout(supabase.auth.getUser());
      const uid = userData.user?.id;
      if (!uid) {
        toast.error("تعذر التحقق من الحساب، حاول مرة أخرى.");
        return;
      }
      const { data: role, error: roleError } = await withTimeout(
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", uid)
          .eq("role", "admin")
          .maybeSingle(),
      );
      if (roleError) throw roleError;

      if (role) {
        toast.success(claimed ? "تم تعيينك مديرًا للموقع بنجاح" : "تم تسجيل الدخول بنجاح");
        void navigate({ to: "/admin" });
      } else {
        toast.error("هذا الحساب لا يملك صلاحية الإدارة. تواصل مع مدير الموقع.");
        await supabase.auth.signOut();
      }
    } catch (err) {
      toast.error(arabicNetworkMessage(err));
    }
  };

  const handleForgotPassword = async () => {
    const parsedEmail = z.string().trim().email().safeParse(email);
    if (!parsedEmail.success) {
      toast.error("اكتب بريدك الإلكتروني أولًا ثم اضغط نسيت كلمة المرور");
      return;
    }
    setBusy(true);
    try {
      const { error } = await withTimeout(
        supabase.auth.resetPasswordForEmail(parsedEmail.data, {
          redirectTo: `${window.location.origin}/reset-password`,
        }),
      );
      if (error) {
        toast.error(arabicNetworkMessage(error));
        return;
      }
      toast.success("أرسلنا رابط استعادة كلمة المرور إلى بريدك الإلكتروني.");
    } catch (err) {
      toast.error(arabicNetworkMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");
      return;
    }
    setBusy(true);
    try {
      const { error } = await withTimeout(supabase.auth.signInWithPassword(parsed.data));
      if (error) {
        toast.error(
          error.message.includes("Invalid login")
            ? "البريد الإلكتروني أو كلمة المرور غير صحيحة"
            : error.message.includes("Email not confirmed")
              ? "لم يتم تفعيل البريد الإلكتروني بعد. افتح رسالة التفعيل في بريدك ثم أعد المحاولة."
              : arabicNetworkMessage(error),
        );
        return;
      }
      await afterAuth();
    } catch (err) {
      toast.error(arabicNetworkMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signUp({
          ...parsed.data,
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        }),
      );
      if (error) {
        toast.error(
          error.message.includes("already registered")
            ? "هذا البريد مسجّل مسبقًا، سجّل الدخول بدلًا من ذلك"
            : error.message.toLowerCase().includes("pwned") ||
                error.message.toLowerCase().includes("compromised")
              ? "كلمة المرور هذه مسربة في اختراقات معروفة، اختر كلمة مرور أقوى."
              : arabicNetworkMessage(error),
        );
        return;
      }
      if (data.session) {
        await afterAuth();
      } else {
        toast.success(
          "تم إنشاء الحساب. تأكيد البريد مطلوب: افتح رسالة التفعيل المرسلة إلى بريدك ثم عد وسجّل الدخول.",
        );
        setTab("signin");
      }
    } catch (err) {
      toast.error(arabicNetworkMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-14">
      <div className="mb-6 text-center">
        <span className="surface-hero mx-auto flex size-14 items-center justify-center rounded-2xl text-primary-foreground">
          <ShieldCheck className="size-7" />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold">لوحة إدارة مكتبة اليعقوبي</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          هذه الصفحة مخصصة لإدارة الموقع فقط. لا يحتاج الطلاب إلى تسجيل الدخول.
        </p>
      </div>

      {adminExists === false ? (
        <Alert className="mb-5">
          <AlertTitle>إعداد أول مرة</AlertTitle>
          <AlertDescription>
            لا يوجد مدير للموقع بعد. أول حساب يتم إنشاؤه هنا سيصبح مدير الموقع تلقائيًا، وبعدها
            تُغلق هذه الإمكانية نهائيًا.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="p-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="signin" className="flex-1">
              تسجيل الدخول
            </TabsTrigger>
            <TabsTrigger value="signup" className="flex-1" disabled={adminExists === true}>
              إنشاء حساب المدير
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-5">
            <form onSubmit={handleSignIn} className="space-y-4">
              <Field
                id="email-in"
                label="البريد الإلكتروني"
                type="email"
                value={email}
                onChange={setEmail}
              />
              <Field
                id="pass-in"
                label="كلمة المرور"
                type="password"
                value={password}
                onChange={setPassword}
              />
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
                دخول
              </Button>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="w-full text-sm text-primary underline-offset-4 hover:underline"
                disabled={busy}
              >
                نسيت كلمة المرور؟
              </button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="mt-5">
            {adminExists === true ? (
              <p className="text-sm text-muted-foreground">
                تم إنشاء حساب المدير مسبقًا وأُغلق التسجيل نهائيًا. إضافة مشرف جديد تتم حصرًا من
                داخل لوحة التحكم بواسطة مشرف مسجّل.
              </p>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-4">
                <Field
                  id="email-up"
                  label="البريد الإلكتروني"
                  type="email"
                  value={email}
                  onChange={setEmail}
                />
                <Field
                  id="pass-up"
                  label="كلمة المرور (8 أحرف على الأقل)"
                  type="password"
                  value={password}
                  onChange={setPassword}
                />
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <UserPlus className="size-4" />
                  )}
                  إنشاء حساب المدير
                </Button>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        autoComplete={type === "password" ? "current-password" : "email"}
      />
    </div>
  );
}
