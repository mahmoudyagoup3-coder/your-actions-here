import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { arabicNetworkMessage, withTimeout } from "@/lib/with-timeout";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "تعيين كلمة مرور جديدة | مكتبة اليعقوبي" },
      {
        name: "description",
        content: "صفحة تعيين كلمة مرور جديدة لحساب إدارة مكتبة اليعقوبي.",
      },
      { property: "og:title", content: "تعيين كلمة مرور جديدة | مكتبة اليعقوبي" },
      {
        property: "og:description",
        content: "تعيين كلمة مرور جديدة لحساب الإدارة في مكتبة اليعقوبي.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("كلمة المرور يجب ألا تقل عن 8 أحرف");
      return;
    }
    if (password !== confirm) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }
    setBusy(true);
    try {
      const { error } = await withTimeout(supabase.auth.updateUser({ password }));
      if (error) {
        toast.error(
          error.message.toLowerCase().includes("session")
            ? "انتهت صلاحية رابط الاستعادة. اطلب رابطًا جديدًا من صفحة الدخول."
            : arabicNetworkMessage(error),
        );
        return;
      }
      toast.success("تم تغيير كلمة المرور بنجاح");
      void navigate({ to: "/admin" });
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
          <KeyRound className="size-7" />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold">تعيين كلمة مرور جديدة</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          افتح هذه الصفحة من رابط الاستعادة المرسل إلى بريدك، ثم اكتب كلمة المرور الجديدة.
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-pass">كلمة المرور الجديدة (8 أحرف على الأقل)</Label>
            <Input
              id="new-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-pass-2">تأكيد كلمة المرور</Label>
            <Input
              id="new-pass-2"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
            حفظ كلمة المرور
          </Button>
        </form>
      </Card>
    </div>
  );
}
