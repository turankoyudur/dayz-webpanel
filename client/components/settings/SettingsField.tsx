import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SettingsFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  helperText?: string;
};

/**
 * Reusable settings input field.
 *
 * - Keeps Settings pages consistent.
 * - Optional placeholder/type/helperText give us flexibility without duplicating UI.
 */
export default function SettingsField({
  label,
  value,
  onChange,
  placeholder,
  type,
  helperText,
}: SettingsFieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={value}
        placeholder={placeholder}
        type={type}
        onChange={(event) => onChange(event.target.value)}
      />
      {helperText ? (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
}
