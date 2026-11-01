import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { LayoutDashboard, Menu, Moon, Search, ShieldCheck, X } from "lucide-react";
import logoAsset from "@/assets/logo-maktabat-al-yaqoubi.jpg.asset.json";

const logoUrl = logoAsset.url;
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { STAGES } from "@/lib/curriculum";

const linkClass =
  "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";
const activeClass = "bg-primary-soft text-primary";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { isAdmin } = useAuth();

  const nav = (
    <>
      <Link
        to="/"
        className={linkClass}
        activeOptions={{ exact: true }}
        activeProps={{ className: `${linkClass} ${activeClass}` }}
        onClick={() => setOpen(false)}
      >
        الرئيسية
      </Link>
      {STAGES.map((stage) => (
        <Link
          key={stage.key}
          to="/stage/$stage"
          params={{ stage: stage.key }}
          className={linkClass}
          activeProps={{ className: `${linkClass} ${activeClass}` }}
          onClick={() => setOpen(false)}
        >
          {stage.name}
        </Link>
      ))}
      <Link
        to="/search"
        className={linkClass}
        activeProps={{ className: `${linkClass} ${activeClass}` }}
        onClick={() => setOpen(false)}
      >
        بحث
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <img
            src={logoUrl}
            alt="شعار مكتبة اليعقوبي"
            className="size-11 rounded-xl object-contain"
          />
          <span className="text-lg font-bold text-primary">مكتبة اليعقوبي</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">{nav}</nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="lg:hidden" aria-label="بحث">
            <Link to="/search">
              <Search className="size-5" />
            </Link>
          </Button>
          {isAdmin ? (
            <>
              <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
                <Link to="/dashboard">
                  <LayoutDashboard className="size-4" />
                  لوحة الإحصائيات
                </Link>
              </Button>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link to="/admin">
                  <ShieldCheck className="size-4" />
                  لوحة التحكم
                </Link>
              </Button>
            </>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="القائمة"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {open ? (
        <nav className="flex flex-col gap-1 border-t border-border bg-background px-4 py-3 lg:hidden">
          {nav}
          {isAdmin ? (
            <>
              <Link to="/dashboard" className={linkClass} onClick={() => setOpen(false)}>
                لوحة الإحصائيات
              </Link>
              <Link to="/admin" className={linkClass} onClick={() => setOpen(false)}>
                لوحة التحكم
              </Link>
            </>
          ) : null}
        </nav>
      ) : null}
    </header>
  );
}
