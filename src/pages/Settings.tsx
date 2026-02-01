import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SubscriptionSection } from "@/components/subscription";

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
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [emailTips, setEmailTips] = useState(true);
  const [productUpdates, setProductUpdates] = useState(true);
  const [unsubscribeAll, setUnsubscribeAll] = useState(false);

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
        const unsubscribeValue = localStorage.getItem("sl_settings_unsubscribe_all");
        if (tipsValue !== null) setEmailTips(tipsValue === "true");
        if (updatesValue !== null) setProductUpdates(updatesValue === "true");
        if (unsubscribeValue !== null) setUnsubscribeAll(unsubscribeValue === "true");
      }
      setIsLoading(false);
    };

    loadSettings();
  }, [navigate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("sl_settings_email_tips", String(emailTips));
    localStorage.setItem("sl_settings_product_updates", String(productUpdates));
    localStorage.setItem("sl_settings_unsubscribe_all", String(unsubscribeAll));
  }, [emailTips, productUpdates, unsubscribeAll]);

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

  const handlePasswordResetEmail = async () => {
    if (!email) {
      toast({
        title: "Missing email",
        description: "We could not find an email for this account.",
        variant: "destructive",
      });
      return;
    }

    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      toast({
        title: "Reset email sent",
        description: "Check your inbox to reset your password.",
      });
    } catch (error: any) {
      toast({
        title: "Reset failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      try {
        await (await import('@/lib/functions-client')).invokeFunction('delete-account');
      } catch (err) {
        throw err;
      }
      await supabase.auth.signOut();
      toast({
        title: "Account deleted",
        description: "Your data has been removed.",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <AppShell showNavigation showBottomNav contentClassName="px-[5px] lg:px-4 py-6 md:py-10">
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
                Photo avatar coming soon.
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
            <Button
              variant="outline"
              type="button"
              onClick={handlePasswordResetEmail}
            >
              Send password reset email
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
              <Switch
                checked={emailTips}
                onCheckedChange={setEmailTips}
                disabled={unsubscribeAll}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Product updates</p>
                <p className="text-sm text-muted-foreground">New features and product updates.</p>
              </div>
              <Switch
                checked={productUpdates}
                onCheckedChange={setProductUpdates}
                disabled={unsubscribeAll}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Unsubscribe from all emails</p>
                <p className="text-sm text-muted-foreground">
                  This only updates your in-app preferences. TODO: connect to the email provider.
                </p>
              </div>
              <Switch checked={unsubscribeAll} onCheckedChange={setUnsubscribeAll} />
            </div>
          </CardContent>
        </Card>

        <SubscriptionSection />

        <Card>
          <CardHeader>
            <CardTitle>Delete Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Permanently remove your account and all associated data from SkinLytix.
            </p>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              Delete my account
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Your profile, scans, routines, and saved dupes will be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAccount}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeletingAccount}
            >
              {isDeletingAccount ? "Deleting..." : "Delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
};

export default Settings;
