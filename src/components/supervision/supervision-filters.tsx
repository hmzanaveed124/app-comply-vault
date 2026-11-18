import type { SupervisionFilterOption } from "~/lib/types";
import type { SupervisionFilterState } from "~/server/supervision/filters";
import {
  SUPERVISION_CHANNELS,
  SUPERVISION_CONTROLS,
  SUPERVISION_FILTER_LABELS,
  SUPERVISION_FINDING_STATUSES,
  SUPERVISION_OUTCOMES,
  SUPERVISION_SEVERITIES,
} from "~/server/supervision/filters";

type SupervisionFiltersProps = {
  filters: SupervisionFilterState;
  firms: SupervisionFilterOption[];
  advisers: SupervisionFilterOption[];
  action?: string;
};

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex min-w-[9rem] flex-col gap-1">
      <label htmlFor={id} className="text-[11px] font-medium uppercase tracking-[0.04em] text-text-secondary">
        {label}
      </label>
      {children}
    </div>
  );
}

const selectClass =
  "h-9 w-full rounded-[8px] border border-surface-border bg-surface-card px-2 text-[13px] text-text-primary outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20";

export function SupervisionFilters({
  filters,
  firms,
  advisers,
  action = "/supervision",
}: SupervisionFiltersProps): React.JSX.Element {
  return (
    <form
      method="get"
      action={action}
      className="rounded-[12px] border border-surface-border bg-surface-card p-4 shadow-[0_1px_2px_rgba(20,31,25,0.04)]"
      aria-label="Supervision filters"
    >
      <div className="flex flex-wrap items-end gap-3">
        <Field id="supervision-from" label="From">
          <input
            id="supervision-from"
            type="date"
            name="from"
            defaultValue={filters.dateFrom}
            className={selectClass}
          />
        </Field>
        <Field id="supervision-to" label="To">
          <input
            id="supervision-to"
            type="date"
            name="to"
            defaultValue={filters.dateTo}
            className={selectClass}
          />
        </Field>
        <Field id="supervision-firm" label="Firm">
          <select
            id="supervision-firm"
            name="firm"
            defaultValue={filters.firmId ?? ""}
            className={selectClass}
          >
            <option value="">All authorised firms</option>
            {firms.map((firm) => (
              <option key={firm.id} value={firm.id}>
                {firm.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="supervision-adviser" label="Adviser">
          <select
            id="supervision-adviser"
            name="adviser"
            defaultValue={filters.adviserId ?? ""}
            className={selectClass}
          >
            <option value="">All advisers</option>
            {advisers.map((adviser) => (
              <option key={adviser.id} value={adviser.id}>
                {adviser.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="supervision-channel" label="Channel">
          <select
            id="supervision-channel"
            name="channel"
            defaultValue={filters.channel ?? ""}
            className={selectClass}
          >
            <option value="">All channels</option>
            {SUPERVISION_CHANNELS.map((channel) => (
              <option key={channel} value={channel}>
                {SUPERVISION_FILTER_LABELS.channel[channel]}
              </option>
            ))}
          </select>
        </Field>
        <Field id="supervision-control" label="Control">
          <select
            id="supervision-control"
            name="control"
            defaultValue={filters.control ?? ""}
            className={selectClass}
          >
            <option value="">All controls</option>
            {SUPERVISION_CONTROLS.map((control) => (
              <option key={control} value={control}>
                {SUPERVISION_FILTER_LABELS.control[control]}
              </option>
            ))}
          </select>
        </Field>
        <Field id="supervision-outcome" label="Outcome">
          <select
            id="supervision-outcome"
            name="outcome"
            defaultValue={filters.outcome ?? ""}
            className={selectClass}
          >
            <option value="">All outcomes</option>
            {SUPERVISION_OUTCOMES.map((outcome) => (
              <option key={outcome} value={outcome}>
                {SUPERVISION_FILTER_LABELS.outcome[outcome]}
              </option>
            ))}
          </select>
        </Field>
        <Field id="supervision-severity" label="Severity">
          <select
            id="supervision-severity"
            name="severity"
            defaultValue={filters.severity ?? ""}
            className={selectClass}
          >
            <option value="">All severities</option>
            {SUPERVISION_SEVERITIES.map((severity) => (
              <option key={severity} value={severity}>
                {SUPERVISION_FILTER_LABELS.severity[severity]}
              </option>
            ))}
          </select>
        </Field>
        <Field id="supervision-status" label="Finding status">
          <select
            id="supervision-status"
            name="status"
            defaultValue={filters.findingStatus ?? ""}
            className={selectClass}
          >
            <option value="">All statuses</option>
            {SUPERVISION_FINDING_STATUSES.map((status) => (
              <option key={status} value={status}>
                {SUPERVISION_FILTER_LABELS.findingStatus[status]}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex gap-2 pb-0.5">
          <button
            type="submit"
            className="h-9 rounded-[8px] bg-surface-strong px-3 text-[13px] font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Apply
          </button>
          <a
            href={action}
            className="inline-flex h-9 items-center rounded-[8px] border border-surface-border px-3 text-[13px] font-medium text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Clear
          </a>
        </div>
      </div>
    </form>
  );
}
