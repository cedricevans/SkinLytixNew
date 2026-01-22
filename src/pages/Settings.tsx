import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [emailTips, setEmailTips] = useState(true);
  const [productUpdates, setProductUpdates] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, email")
        .eq("id", user.id)
        .maybeSingle();

      const fallbackName = user.email ? user.email.split("@")[0] : "SkinLytix";
      setDisplayName(profile?.display_name || user.user_metadata?.display_name || fallbackName);
      setEmail(user.email || profile?.email || "");

      if (typeof window !== "undefined") {
        const tipsValue = localStorage.getItem("sl_settings_email_tips");
        const updatesValue = localStorage.getItem("sl_settings_product_updates");
        if (tipsValue !== null) setEmailTips(tipsValue === "true");
        if (updatesValue !== null) setProductUpdates(updatesValue === "true");
      }
      setIsLoading(false);
    };

    loadSettings();
  }, [navigate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("sl_settings_email_tips", String(emailTips));
    localStorage.setItem("sl_settings_product_updates", String(productUpdates));
  }, [emailTips, productUpdates]);

  const getInitials = (value: string) => {
    const parts = value.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "SL";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  };

  const initials = useMemo(() => getInitials(displayName), [displayName]);

  const handleProfileSave = async () => {
    setIsSavingProfile(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ display_name: displayName })
        .eq("id", user.id);

      if (profileError) throw profileError;

      const { error: userError } = await supabase.auth.updateUser({
        data: { display_name: displayName },
      });

      if (userError) throw userError;

      if (typeof window !== "undefined") {
        localStorage.setItem("sl_user_initials", initials);
      }

      toast({
        title: "Settings updated",
        description: "Your display name has been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Use at least 6 characters.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please re-enter your password.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Password updated",
        description: "Your new password is saved.",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <AppShell showNavigation showBottomNav contentClassName="px-4 py-6 md:py-10">
      <PageHeader>
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Settings</p>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Account settings</h1>
        </div>
      </PageHeader>

      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center border border-border">
                <span className="text-sm font-semibold text-muted-foreground">
                  {initials}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Initials avatar for now. Photo uploads coming soon.
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="display-name">Display name</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={email} disabled />
              </div>
            </div>
            <Button onClick={handleProfileSave} disabled={isSavingProfile || isLoading}>
              {isSavingProfile ? "Saving..." : "Save changes"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Enter a new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter password"
                />
              </div>
            </div>
            <Button onClick={handlePasswordUpdate} disabled={isUpdatingPassword}>
              {isUpdatingPassword ? "Updating..." : "Update password"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Skin insights tips</p>
                <p className="text-sm text-muted-foreground">Monthly tips and routine suggestions.</p>
              </div>
              <Switch checked={emailTips} onCheckedChange={setEmailTips} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Product updates</p>
                <p className="text-sm text-muted-foreground">New features and beta updates.</p>
              </div>
              <Switch checked={productUpdates} onCheckedChange={setProductUpdates} />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
};

export default Settings;
