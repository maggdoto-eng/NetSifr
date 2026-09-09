import Link from 'next/link';

/**
 * The white admin page header (prototype's `.a-topbar`): a breadcrumb on the
 * left and page actions on the right. Presentational — each page passes its
 * own crumb trail and action buttons.
 */
export function AdminTopbar({
  trail,
  actions,
}: {
  trail: Array<{ label: string; href?: string; pill?: React.ReactNode }>;
  actions?: React.ReactNode;
}) {
  return (
    <div className="a-topbar">
      <div className="a-crumb">
        {trail.map((c, i) => (
          <span key={i} className="row" style={{ gap: 'var(--s2)' }}>
            {i > 0 && <span className="sep">/</span>}
            {c.href ? (
              <Link href={c.href} style={{ color: 'var(--coral)' }}>
                {c.label}
              </Link>
            ) : (
              <span>{c.label}</span>
            )}
            {c.pill}
          </span>
        ))}
      </div>
      {actions && (
        <div className="row" style={{ gap: 'var(--s2)' }}>
          {actions}
        </div>
      )}
    </div>
  );
}
