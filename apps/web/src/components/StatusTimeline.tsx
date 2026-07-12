import { useTranslation } from "react-i18next";
import { CLAIM_STAGES, TERMINAL_STAGES, type ClaimStage } from "@claimsarathi/shared";

interface StatusTimelineProps {
  currentStage: ClaimStage;
}

/**
 * Renders the fixed 7-stage pipeline from packages/shared, highlighting the
 * claim's current position. REJECTED is a terminal branch off the happy
 * path, so it's only shown when it's actually where the claim landed.
 */
export function StatusTimeline({ currentStage }: StatusTimelineProps) {
  const { t } = useTranslation();

  const happyPath = CLAIM_STAGES.filter((stage) => stage !== "REJECTED");
  const stages = currentStage === "REJECTED" ? [...happyPath.slice(0, -1), "REJECTED" as ClaimStage] : happyPath;

  const currentIndex = stages.indexOf(currentStage);

  return (
    <ol className="flex flex-col gap-0">
      {stages.map((stage, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isRejected = stage === "REJECTED";

        return (
          <li key={stage} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={[
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  isRejected && isCurrent
                    ? "bg-gradient-to-br from-red-500 to-red-600 text-white shadow-sm"
                    : isComplete
                      ? "bg-gradient-to-br from-brand-500 to-amber-500 text-white shadow-sm"
                      : isCurrent
                        ? "bg-white text-brand-700 ring-2 ring-brand-500 shadow-sm"
                        : "bg-gray-200 text-gray-500",
                ].join(" ")}
                aria-hidden
              >
                {isComplete ? "✓" : index + 1}
              </span>
              {index < stages.length - 1 && (
                <span
                  className={["mt-1 h-8 w-0.5", isComplete ? "bg-gradient-to-b from-brand-500 to-amber-500" : "bg-gray-200"].join(" ")}
                  aria-hidden
                />
              )}
            </div>
            <div className="pb-6">
              <p
                className={[
                  "text-sm font-medium",
                  isRejected && isCurrent ? "text-red-700" : isCurrent ? "text-brand-700" : "text-gray-700",
                ].join(" ")}
              >
                {t(`stages.${stage}`)}
              </p>
              {isCurrent && !TERMINAL_STAGES.has(stage) && (
                <p className="text-xs text-gray-500">{t("claims.detail.timeline")}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
