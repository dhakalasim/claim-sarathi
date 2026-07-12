import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Claim, Paginated } from "@claimsarathi/shared";
import { apiClient } from "../../api/client";
import { ClaimCard } from "../../components/ClaimCard";

export function AdminDashboardPage() {
  const { t } = useTranslation();
  const [claims, setClaims] = useState<Claim[] | null>(null);
  const [slaBreachedOnly, setSlaBreachedOnly] = useState(false);

  useEffect(() => {
    const query = slaBreachedOnly ? "?slaBreached=true" : "";
    apiClient.get<Paginated<Claim>>(`/claims${query}`).then((res) => setClaims(res.items));
  }, [slaBreachedOnly]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">{t("admin.dashboard.title")}</h1>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={slaBreachedOnly}
            onChange={(e) => setSlaBreachedOnly(e.target.checked)}
            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          {t("admin.dashboard.slaBreach")}
        </label>
      </div>

      {claims === null && <p className="text-sm text-gray-400">Loading…</p>}
      {claims?.length === 0 && <p className="text-sm text-gray-500">{t("claims.list.empty")}</p>}

      <div className="flex flex-col gap-3">
        {claims?.map((claim) => <ClaimCard key={claim.id} claim={claim} />)}
      </div>
    </div>
  );
}
