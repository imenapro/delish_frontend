import { useUIPersistence } from "@/contexts/ui-persistence-context";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function UIPersistenceSettings() {
  const { isEnabled, setIsEnabled } = useUIPersistence();

  return (
    <Card>
      <CardHeader>
        <CardTitle>UI Persistence</CardTitle>
        <CardDescription>
          Configure how the application handles UI state when switching windows or tabs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between space-x-2">
          <div className="flex flex-col space-y-1">
            <Label htmlFor="ui-persistence-mode" className="font-medium">
              Prevent closing on window blur
            </Label>
            <span className="text-sm text-muted-foreground">
              Keep menus, dialogs, and popovers open when you switch to another window or tab.
            </span>
          </div>
          <Switch
            id="ui-persistence-mode"
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
          />
        </div>
      </CardContent>
    </Card>
  );
}
