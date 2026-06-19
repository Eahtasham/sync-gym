import { Info, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import {
  ChangePinForm,
  DangerZone,
  ProfileSettings,
} from "@/components/settings/settings-client";
import { lockAction } from "@/lib/actions/auth-actions";
import { requireUser } from "@/lib/auth";
import { RETENTION_DAYS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" subtitle={`Signed in as ${user.name}`} />

      <ProfileSettings initialName={user.name} initialGoal={user.weeklyGoal} />

      <ChangePinForm />

      <Card className="gap-4 p-4">
        <div className="flex items-center gap-2">
          <LogOut className="size-4 text-primary" />
          <h2 className="font-semibold">Switch user</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Lock and return to the profile picker to switch between accounts.
        </p>
        <form action={lockAction}>
          <Button type="submit" variant="secondary" className="w-full">
            Switch / lock
          </Button>
        </form>
      </Card>

      <DangerZone />

      <Card className="gap-2 p-4">
        <div className="flex items-center gap-2">
          <Info className="size-4 text-muted-foreground" />
          <h2 className="font-semibold">About</h2>
        </div>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Units</dt>
            <dd>Kilograms (kg)</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">History retained</dt>
            <dd>{RETENTION_DAYS} days</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">App</dt>
            <dd>Sync Gym</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
