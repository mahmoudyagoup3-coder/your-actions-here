import { Link } from "@tanstack/react-router";
import { STAGES } from "@/lib/curriculum";
import logoAsset from "@/assets/logo-maktabat-al-yaqoubi.jpg.asset.json";

const logoUrl = logoAsset.url;

export function SiteFooter() {
  return (
    <footer className="surface-footer mt-20 border-t border-border text-foreground">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <img
              src={logoUrl}
              alt="شعار مكتبة اليعقوبي"
              className="size-10 rounded-xl object-contain"
            />
            <span className="text-lg font-bold text-primary">مكتبة اليعقوبي</span>
          </div>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            منصة عربية مجانية توفّر الكتب والمذكرات الدراسية بصيغة PDF لجميع المراحل التعليمية.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-bold">المراحل التعليمية</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {STAGES.map((stage) => (
              <li key={stage.key}>
                <Link
                  to="/stage/$stage"
                  params={{ stage: stage.key }}
                  className="transition-colors hover:text-primary"
                >
                  {stage.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold">روابط سريعة</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/" className="transition-colors hover:text-primary">
                الصفحة الرئيسية
              </Link>
            </li>
            <li>
              <Link to="/search" className="transition-colors hover:text-primary">
                البحث في الملفات
              </Link>
            </li>
          </ul>
        </div>

      </div>

      <div className="border-t border-border px-4 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} مكتبة اليعقوبي — جميع الحقوق محفوظة.
      </div>
    </footer>
  );
}
