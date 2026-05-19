const COLORS = [
  { name: "yellow", hex: "#fef3c7" },
  { name: "pink", hex: "#fce7f3" },
  { name: "blue", hex: "#dbeafe" },
  { name: "green", hex: "#d1fae5" },
  { name: "purple", hex: "#ede9fe" },
  { name: "orange", hex: "#ffedd5" },
] as const;

type ColorName = (typeof COLORS)[number]["name"];

interface ColorPickerProps {
  selected: ColorName;
  onSelect: (color: ColorName) => void;
  disabled: boolean;
}

export default function ColorPicker({ selected, onSelect, disabled }: ColorPickerProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-stone-500 mr-1">颜色:</span>
      {COLORS.map((c) => (
        <button
          key={c.name}
          onClick={() => onSelect(c.name)}
          disabled={disabled}
          className={`w-6 h-6 rounded-full border-2 transition-transform
            ${selected === c.name ? "border-stone-700 scale-110" : "border-stone-300"}
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-105"}`}
          style={{ backgroundColor: c.hex }}
          aria-label={`选择${c.name}色便签`}
        />
      ))}
    </div>
  );
}

export type { ColorName };
