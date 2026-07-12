import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Claim, Paginated } from "@claimsarathi/shared";
import { apiClient } from "../../api/client";
import { ClaimCard } from "../../components/ClaimCard";

export function BranchQueuePage() {
  const { t } = useTranslation();
  const [claims, setClaims] = useState<Claim[] | null>(null);

  useEffect(() => {
    apiClient.get<Paginated<Claim>>("/claims").then((res) => setClaims(res.items));
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-lg font-semibold text-gray-900">{t("branch.queue.title")}</h1>
      {claims === null && <p className="text-sm text-gray-400">Loading…</p>}
      {claims?.length === 0 && <p className="text-sm text-gray-500">{t("claims.list.empty")}</p>}
      <div className="flex flex-col gap-3">
        {claims?.map((claim) => <ClaimCard key={claim.id} claim={claim} />)}
      </div>
    </div>
  );
}
