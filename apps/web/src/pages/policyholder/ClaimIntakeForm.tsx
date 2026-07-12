import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CLAIM_TYPES, type Claim, type ClaimType } from "@claimsarathi/shared";
import { apiClient, ApiError } from "../../api/client";
import { PhotoUpload } from "../../components/PhotoUpload";

export function ClaimIntakeForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [policyNumber, setPolicyNumber] = useState("");
  const [claimType, setClaimType] = useState<ClaimType>("MOTOR");
  const [incidentDate, setIncidentDate] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const claim = await apiClient.post<Claim>("/claims", {
        policyNumber,
        claimType,
        incidentDate,
        description,
      });

      await Promise.all(
        photos.map((photo) => {
          const form = new FormData();
          form.append("tag", "PHOTO");
          form.append("file", photo);
          return apiClient.postForm(`/claims/${claim.id}/documents`, form);
        }),
      );

      navigate(`/claims/${claim.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-4 text-lg font-semibold text-gray-900">{t("claims.intake.title")}</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="policyNumber" className="mb-1 block text-sm font-medium text-gray-700">
            {t("claims.intake.policyNumber")}
          </label>
          <input
            id="policyNumber"
            required
            value={policyNumber}
            onChange={(e) => setPolicyNumber(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label htmlFor="claimType" className="mb-1 block text-sm font-medium text-gray-700">
            {t("claims.intake.claimType")}
          </label>
          <select
            id="claimType"
            value={claimType}
            onChange={(e) => setClaimType(e.target.value as ClaimType)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {CLAIM_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`claimTypes.${type}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="incidentDate" className="mb-1 block text-sm font-medium text-gray-700">
            {t("claims.intake.incidentDate")}
          </label>
          <input
            id="incidentDate"
            type="date"
            required
            max={new Date().toISOString().slice(0, 10)}
            value={incidentDate}
            onChange={(e) => setIncidentDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700">
            {t("claims.intake.description")}
          </label>
          <textarea
            id="description"
            required
            minLength={10}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <PhotoUpload onChange={setPhotos} />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 rounded-md bg-gradient-to-r from-brand-500 to-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-orange-900/20 transition hover:from-brand-600 hover:to-amber-600 disabled:opacity-50"
        >
          {t("claims.intake.submit")}
        </button>
      </form>
    </div>
  );
}
