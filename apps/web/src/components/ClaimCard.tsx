import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Claim } from "@claimsarathi/shared";

export function ClaimCard({ claim }: { claim: Claim }) {
  const { t } = useTranslation();

  return (
    <Link
      to={`/claims/${claim.id}`}
      className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-brand-500 hover:shadow"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm text-gray-500">{claim.claimNumber}</span>
        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
          {t(`stages.${claim.currentStage}`)}
        </span>
      </div>
      <p className="mt-2 text-sm font-medium text-gray-900">{t(`claimTypes.${claim.claimType}`)}</p>
      <p className="mt-1 line-clamp-2 text-sm text-gray-600">{claim.description}</p>
      <p className="mt-2 text-xs text-gray-400">
        {t("claims.list.incidentDate")}: {new Date(claim.incidentDate).toLocaleDateString()}
      </p>
    </Link>
  );
}
