import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(
  supabase: { from: (t: "user_roles") => any },
  userId: string,
) {
  if (!userId) throw new Error("يجب تسجيل الدخول أولًا");
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error("تعذر التحقق من الصلاحيات");
  if (!data) throw new Error("هذه العملية متاحة لمشرفي الموقع فقط");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function findUserByEmail(email: string) {
  const sb = await admin();
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error("تعذر قراءة قائمة الحسابات");
    const found = data.users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (found) return found;
    if (data.users.length < 200) break;
  }
  return null;
}

export const listAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = await admin();
    const { data: roles, error } = await sb
      .from("user_roles")
      .select("user_id, role, created_at")
      .eq("role", "admin");
    if (error) throw new Error("تعذر قراءة قائمة المشرفين");

    const { data: users, error: usersError } = await sb.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (usersError) throw new Error("تعذر قراءة بيانات الحسابات");

    return (roles ?? []).map((r) => {
      const u = users.users.find((x) => x.id === r.user_id);
      return {
        userId: r.user_id,
        email: u?.email ?? "—",
        createdAt: r.created_at as string,
        lastSignInAt: u?.last_sign_in_at ?? null,
        isSelf: r.user_id === context.userId,
      };
    });
  });

export const addAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        password: z.string().min(8).max(72).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = await admin();
    let user = await findUserByEmail(data.email);

    if (!user) {
      if (!data.password) {
        throw new Error("هذا البريد غير مسجل، أدخل كلمة مرور لإنشاء حساب جديد");
      }
      const { data: created, error } = await sb.auth.admin.createUser({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        email_confirm: true,
      });
      if (error || !created.user) {
        console.error(error);
        throw new Error("تعذر إنشاء الحساب، تأكد من البريد وكلمة المرور");
      }
      user = created.user;
    } else if (data.password) {
      const { error } = await sb.auth.admin.updateUserById(user.id, {
        password: data.password,
      });
      if (error) throw new Error("تعذر تحديث كلمة المرور");
    }

    const { error: roleError } = await sb
      .from("user_roles")
      .upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });
    if (roleError) throw new Error("تعذر منح صلاحية الإشراف");

    return { ok: true, email: user.email };
  });

export const resetAdminPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ userId: z.string().uuid(), password: z.string().min(8).max(72) }).parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = await admin();
    const { error } = await sb.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error("تعذر تغيير كلمة المرور");
    return { ok: true };
  });

export const removeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) {
      throw new Error("لا يمكنك إزالة صلاحيتك بنفسك");
    }
    const sb = await admin();
    const { count } = await sb
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) throw new Error("يجب أن يبقى مشرف واحد على الأقل");
    const { error } = await sb
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", "admin");
    if (error) throw new Error("تعذر إزالة المشرف");
    return { ok: true };
  });
