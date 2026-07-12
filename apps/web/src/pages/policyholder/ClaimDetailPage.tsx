import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import type { Claim, ClaimStageEvent, DocumentDto } from "@claimsarathi/shared";
import { apiClient } from "../../api/client";
import { StatusTimeline } from "../../components/StatusTimeline";

type ClaimDetail = Claim & {
  stageEvents: ClaimStageEvent[];
  documents: DocumentDto[];
};

export function ClaimDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [claim, setClaim] = useState<ClaimDetail | null>(null);

  useEffect(() => {
    if (!id) return;
    apiClient.get<ClaimDetail>(`/claims/${id}`).then(setClaim);
  }, [id]);

  if (!claim) {
    return <p className="p-6 text-sm text-gray-400">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link to="/" className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        ← {t("claims.detail.back")}
      </Link>

      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="font-mono text-sm text-gray-500">{claim.claimNumber}</h1>
          <span className="rounded-full bg-gradient-to-r from-brand-50 to-amber-50 px-2 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200">
            {t(`claimTypes.${claim.claimType}`)}
          </span>
        </div>

        <h2 className="mt-3 text-sm font-medium text-gray-700">{t("claims.detail.description")}</h2>
        <p className="mt-1 text-sm text-gray-600">{claim.description}</p>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">{t("claims.detail.timeline")}</h2>
        <StatusTimeline currentStage={claim.currentStage} />
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">{t("claims.detail.documents")}</h2>
        {claim.documents.length === 0 ? (
          <p className="text-sm text-gray-500">—</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {claim.documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{doc.fileName}</span>
                <span className="text-xs text-gray-400">v{doc.version}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
