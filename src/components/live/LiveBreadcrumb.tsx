import { ArrowLeft, ChevronRight } from "lucide-react";
import { label, type Lang } from "./liveState";

type BreadcrumbItem = { label: string; href: string };

export function LiveBreadcrumb({
  items,
  lang,
}: {
  items: BreadcrumbItem[];
  lang: Lang;
}) {
  const parent = items[items.length - 2];
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "instant" });
  return (
    <nav
      className="live-breadcrumb"
      aria-label={label(lang, "页面层级", "Breadcrumb")}
    >
      {parent && (
        <a
          className="live-breadcrumb-back"
          href={parent.href}
          onClick={scrollToTop}
          aria-label={label(
            lang,
            `返回${parent.label}`,
            `Back to ${parent.label}`,
          )}
          title={label(lang, `返回${parent.label}`, `Back to ${parent.label}`)}
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </a>
      )}
      <ol>
        {items.map((item, index) => (
          <li key={item.href}>
            {index > 0 && <ChevronRight size={13} aria-hidden="true" />}
            {index === items.length - 1 ? (
              <span aria-current="page" title={item.label}>
                {item.label}
              </span>
            ) : (
              <a href={item.href} onClick={scrollToTop}>
                {item.label}
              </a>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
