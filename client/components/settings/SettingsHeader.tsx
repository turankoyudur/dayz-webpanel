import { Button } from "@/components/ui/button";

type SettingsHeaderProps = {
  onSave: () => void;
  isSaving: boolean;
};

export default function SettingsHeader({
  onSave,
  isSaving,
}: SettingsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-sm text-muted-foreground">
          All important paths/parameters are editable here.
        </p>
      </div>
      <Button onClick={onSave} disabled={isSaving}>
        Save
      </Button>
    </div>
  );
}
