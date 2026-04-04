import type { ReactNode } from 'react';

type StatCardProps = {
  title: string;
  value: string;
  note?: string;
  icon?: ReactNode;
};

export function StatCard({ title, value, note, icon }: StatCardProps) {
  return (
    <article className="card stat-card">
      <header className="stat-header">
        {icon}
        <span>{title}</span>
      </header>
      <strong className="stat-value">{value}</strong>
      {note ? <p className="muted-text small">{note}</p> : null}
    </article>
  );
}
