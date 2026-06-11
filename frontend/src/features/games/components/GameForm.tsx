import { useState } from "react";
import type { Game, Platform, PriceMode } from "../types";
import { PLATFORM_LABEL } from "../types";

type GameFormProps = {
  initial?: Game;
  onSubmit: (form: FormData) => Promise<void>;
  submitting: boolean;
};

export function GameForm({ initial, onSubmit, submitting }: GameFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [platform, setPlatform] = useState<Platform>(initial?.platform ?? "ps5");
  const [priceMode, setPriceMode] = useState<PriceMode>(initial?.price_mode ?? "dynamic");
  const [z2Usd, setZ2Usd] = useState(initial?.z2_price_usd ?? "");
  const [z3Usd, setZ3Usd] = useState(initial?.z3_price_usd ?? "");
  const [z2Toman, setZ2Toman] = useState(initial?.z2_price_toman?.toString() ?? "");
  const [z3Toman, setZ3Toman] = useState(initial?.z3_price_toman?.toString() ?? "");
  const [z2Slots, setZ2Slots] = useState(initial?.z2_slots?.toString() ?? "");
  const [z3Slots, setZ3Slots] = useState(initial?.z3_slots?.toString() ?? "");
  const [active, setActive] = useState(initial?.active ?? false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const form = new FormData();
    form.append("name", name);
    form.append("platform", platform);
    form.append("price_mode", priceMode);
    if (priceMode === "dynamic") {
      if (z2Usd) form.append("z2_price_usd", z2Usd);
      if (z3Usd) form.append("z3_price_usd", z3Usd);
    } else {
      if (z2Toman) form.append("z2_price_toman", z2Toman);
      if (z3Toman) form.append("z3_price_toman", z3Toman);
    }
    if (z2Slots) form.append("z2_slots", z2Slots);
    if (z3Slots) form.append("z3_slots", z3Slots);
    form.append("active", String(active));
    if (imageFile) form.append("cover_image", imageFile);
    await onSubmit(form);
  }

  const inputClass = "w-full border border-default-200 rounded-lg px-3 py-2 text-sm bg-transparent";
  const labelClass = "block text-sm font-medium mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg" style={{ direction: "rtl" }}>
      <div>
        <label className={labelClass}>نام بازی</label>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div>
        <label className={labelClass}>پلتفرم</label>
        <select className={inputClass} value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
          {(Object.keys(PLATFORM_LABEL) as Platform[]).map((p) => (
            <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>نوع قیمت‌گذاری</label>
        <select className={inputClass} value={priceMode} onChange={(e) => setPriceMode(e.target.value as PriceMode)}>
          <option value="dynamic">پویا (بر اساس دلار)</option>
          <option value="fixed">ثابت (تومان)</option>
        </select>
      </div>

      {priceMode === "dynamic" ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>قیمت Z2 (دلار)</label>
            <input className={inputClass} type="number" step="0.01" value={z2Usd} onChange={(e) => setZ2Usd(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>قیمت Z3 (دلار)</label>
            <input className={inputClass} type="number" step="0.01" value={z3Usd} onChange={(e) => setZ3Usd(e.target.value)} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>قیمت Z2 (تومان)</label>
            <input className={inputClass} type="number" value={z2Toman} onChange={(e) => setZ2Toman(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>قیمت Z3 (تومان)</label>
            <input className={inputClass} type="number" value={z3Toman} onChange={(e) => setZ3Toman(e.target.value)} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>ظرفیت Z2 (اختیاری)</label>
          <input className={inputClass} type="number" value={z2Slots} onChange={(e) => setZ2Slots(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>ظرفیت Z3 (اختیاری)</label>
          <input className={inputClass} type="number" value={z3Slots} onChange={(e) => setZ3Slots(e.target.value)} />
        </div>
      </div>

      <div>
        <label className={labelClass}>تصویر کاور</label>
        <input
          type="file"
          accept="image/*"
          className={inputClass}
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="active" checked={active} onChange={(e) => setActive(e.target.checked)} />
        <label htmlFor="active" className="text-sm">فعال (نمایش در سایت)</label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="px-6 py-2 bg-primary text-white rounded-lg text-sm disabled:opacity-50">
        {submitting ? "در حال ذخیره..." : "ذخیره"}
      </button>
    </form>
  );
}
