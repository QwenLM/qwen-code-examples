const MAX_CHARS = 100;

interface NoteInputProps {
  value: string;
  onChange: (text: string) => void;
  disabled: boolean;
}

export default function NoteInput({ value, onChange, disabled }: NoteInputProps) {
  const charCount = value.length;
  const overLimit = charCount > MAX_CHARS;

  return (
    <div className="w-full">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, MAX_CHARS + 20))}
        disabled={disabled}
        placeholder="输入便签内容..."
        rows={4}
        className={`w-full rounded-lg border-2 p-3 text-base resize-none
          transition-colors duration-200
          ${overLimit ? "border-red-400 bg-red-50" : "border-stone-300 bg-white"}
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          focus:outline-none focus:border-stone-500`}
      />
      <div className="mt-1 flex items-center justify-between text-xs text-stone-500">
        <span className={overLimit ? "text-red-500 font-medium" : ""}>
          {charCount}/{MAX_CHARS}
          {overLimit && " — 便签写不下了"}
        </span>
      </div>
    </div>
  );
}
