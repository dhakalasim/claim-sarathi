import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { Claim, Paginated } from "@claimsarathi/shared";
import { apiClient } from "../../api/client";
import { ClaimCard } from "../../components/ClaimCard";

export function ClaimListPage() {
  const { t } = useTranslation();
  const [claims, setClaims] = useState<Claim[] | null>(null);

  useEffect(() => {
    apiClient.get<Paginated<Claim>>("/claims").then((res) => setClaims(res.items));
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">{t("claims.list.title")}</h1>
        <Link
          to="/claims/new"
          className="rounded-md bg-gradient-to-r from-brand-500 to-amber-500 px-3 py-1.5 text-sm font-medium text-white shadow-sm shadow-orange-900/20 transition hover:from-brand-600 hover:to-amber-600"
        >
          {t("claims.list.newClaim")}
        </Link>
      </div>

      {claims === null && <p className="text-sm text-gray-400">Loading…</p>}
      {claims?.length === 0 && <p className="text-sm text-gray-500">{t("claims.list.empty")}</p>}

      <div className="flex flex-col gap-3">
        {claims?.map((claim) => <ClaimCard key={claim.id} claim={claim} />)}
      </div>
    </div>
  );
}
