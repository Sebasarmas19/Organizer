'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Dot, Flag } from './Marks';
import { Icon } from '@/components/Icon';
import { deleteReminder } from '@/lib/fd4-actions';

export type ReminderCardData = {
  id: string;
  title: string;
  when: string;
  dateStr: string;
  prep: string[];
  emptyLabel: string;
};

export function ReminderCard({
  reminder,
  chevron = false,
}: {
  reminder: ReminderCardData;
  chevron?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirming(true);
  };

  const onConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      await deleteReminder(reminder.id);
    });
  };

  const onCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirming(false);
  };

  return (
    <div className="fd-remcard-wrap" style={{ position: 'relative' }}>
      <div
        className="fd-remcard"
        style={{ opacity: isPending ? 0.4 : 1 }}
      >
        <span className="fd-card__rail fd-card__rail--reminder" aria-hidden />
        <div className="fd-remcard__body">
          <div className="fd-remcard__head">
            <Link
              href={`/calendario?v=dia&d=${reminder.dateStr}`}
              className="fd-remcard__mainlink"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                flex: '1 1 auto',
                minWidth: 0,
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <Flag />
              <span className="fd-remcard__text">
                <span className="fd-remcard__title">{reminder.title}</span>
                <span className="fd-meta">{reminder.when}</span>
              </span>
            </Link>

            {confirming ? (
              <span
                className="fd-remcard__confirm"
                data-no-nav
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  onClick={onConfirm}
                  data-no-nav
                  className="fd-btn fd-btn--ghost fd-btn--sm"
                  style={{
                    height: '36px',
                    padding: '0 12px',
                    fontSize: 'var(--fd-small)',
                    color: 'var(--text-loud)',
                    border: '1px solid var(--line-control)',
                    borderRadius: 'var(--radius-pill)',
                  }}
                >
                  Quitar
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  data-no-nav
                  className="fd-btn fd-btn--ghost fd-btn--sm"
                  style={{
                    height: '36px',
                    padding: '0 10px',
                    fontSize: 'var(--fd-small)',
                    color: 'var(--text-muted)',
                  }}
                >
                  No
                </button>
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  onClick={onDelete}
                  className="fd-remcard__del"
                  aria-label="Quitar recordatorio"
                  title="Quitar recordatorio"
                  data-no-nav
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0',
                    width: '44px',
                    height: '44px',
                    minWidth: '44px',
                    minHeight: '44px',
                    color: 'var(--text-faint)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <Icon name="trash" size="sm" />
                </button>
                {chevron ? (
                  <Link
                    href={`/calendario?v=dia&d=${reminder.dateStr}`}
                    className="fd-remcard__chev"
                    aria-hidden
                    style={{ textDecoration: 'none' }}
                  >
                    ›
                  </Link>
                ) : null}
              </span>
            )}
          </div>

          <Link
            href={`/calendario?v=dia&d=${reminder.dateStr}`}
            className="fd-remcard__preplink"
            style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
          >
            {reminder.prep.length > 0 ? (
              <span className="fd-prep">
                {reminder.prep.map((title, i) => (
                  <span className="fd-prep__item" key={`${reminder.id}-${i}`}>
                    <Dot entity="task" size="xs" />
                    <span>{title}</span>
                  </span>
                ))}
              </span>
            ) : (
              <span className="fd-pill fd-remcard__empty">{reminder.emptyLabel}</span>
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}

