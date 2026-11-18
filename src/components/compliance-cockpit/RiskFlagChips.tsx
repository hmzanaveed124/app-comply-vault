import { X } from "lucide-react";
import { getRiskFlagVariant } from "~/lib/risk-flags";

const VARIANT_CLASSES = {
  regulatory: "bg-danger-bg text-semantic-danger",
  amber: "bg-warning-bg text-semantic-warning",
  info: "bg-info-bg text-semantic-info",
} as const;

type RiskFlagChipsProps = {
  flags: string[];
  onRemove: (flag: string) => void;
  readOnly?: boolean;
};

export function RiskFlagChips({
  flags,
  onRemove,
  readOnly = false,
}: RiskFlagChipsProps): React.JSX.Element | null {
  if (flags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {flags.map((flag) => {
        const variant = getRiskFlagVariant(flag);
        return (
          <span
            key={flag}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${VARIANT_CLASSES[variant]}`}
          >
            {flag}
            {!readOnly ? (
              <button
                type="button"
                onClick={() => onRemove(flag)}
                className="rounded-full p-0.5 hover:bg-black/5"
                aria-label={`Remove ${flag}`}
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
