import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface PhotoUploadProps {
  onChange: (files: File[]) => void;
}

export function PhotoUpload({ onChange }: PhotoUploadProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  function handleFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    setPreviews((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return files.map((file) => URL.createObjectURL(file));
    });
    onChange(files);
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{t("claims.intake.photos")}</label>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        capture="environment"
        onChange={(e) => handleFiles(e.target.files)}
        className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
      />
      {previews.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {previews.map((src) => (
            <img key={src} src={src} alt="" className="h-20 w-full rounded-md object-cover" />
          ))}
        </div>
      )}
    </div>
  );
}
