import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Droplets, Wind, Flame, Shield, Sparkles, Home, ArrowLeft, User } from "lucide-react";

const skinTypes = [
  { value: "oily", label: "Oily", icon: Droplets, description: "Shiny, prone to breakouts" },
  { value: "dry", label: "Dry", icon: Wind, description: "Tight, flaky, rough texture" },
  { value: "combination", label: "Combination", icon: Flame, description: "Oily T-zone, dry cheeks" },
  { value: "sensitive", label: "Sensitive", icon: Shield, description: "Easily irritated, reactive" },
  { value: "normal", label: "Normal", icon: Sparkles, description: "Balanced, healthy glow" },
];

const skinConcerns = [
  { value: "acne", label: "Acne & Breakouts" },
  { value: "aging", label: "Fine Lines & Aging" },
  { value: "hyperpigmentation", label: "Dark Spots & Hyperpigmentation" },
  { value: "redness", label: "Redness & Rosacea" },
  { value: "dryness", label: "Dryness & Dehydration" },
  { value: "dullness", label: "Dullness & Uneven Texture" },
  { value: "pores", label: "Large Pores" },
  { value: "dark_circles", label: "Dark Circles" },
];

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [skinType, setSkinType] = useState<"oily" | "dry" | "combination" | "sensitive" | "normal" | "">("");
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("skin_type, skin_concerns")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setSkinType(data.skin_type || "");
        setSelectedConcerns(Array.isArray(data.skin_concerns) ? data.skin_concerns.filter((c): c is string => typeof c === 'string') : []);
      }
    } catch (error: any) {
      toast({
        title: "Failed to load profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConcernToggle = (concern: string) => {
    setSelectedConcerns((prev) =>
      prev.includes(concern)
        ? prev.filter((c) => c !== concern)
        : [...prev, concern]
    );
  };

  const handleSave = async () => {
    if (!skinType) {
      toast({
        title: "Please select your skin type",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          skin_type: skinType,
          skin_concerns: selectedConcerns,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Profile Updated! ✓",
        description: "Your skin profile has been saved.",
      });

      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: "Failed to save profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate('/')}>
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>

        <Card className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">My Skin Profile</h1>
                <p className="text-muted-foreground">
                  Manage your skin type and concerns
                </p>
              </div>
            </div>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)}>
                Edit Profile
              </Button>
            )}
          </div>

          <div className="space-y-8">
            {/* Skin Type Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Skin Type</h2>
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {skinTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        onClick={() => setSkinType(type.value as "oily" | "dry" | "combination" | "sensitive" | "normal")}
                        className={`p-6 border-2 rounded-lg transition-all hover:border-primary ${
                          skinType === type.value
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                      >
                        <div className="flex flex-col items-center text-center space-y-3">
                          <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
                            <Icon className="w-8 h-8 text-accent" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{type.label}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {type.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 border-2 rounded-lg bg-muted/30">
                  {skinType ? (
                    <div className="flex items-center gap-4">
                      {(() => {
                        const selectedType = skinTypes.find(t => t.value === skinType);
                        if (!selectedType) return null;
                        const Icon = selectedType.icon;
                        return (
                          <>
                            <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                              <Icon className="w-6 h-6 text-accent" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">{selectedType.label}</h3>
                              <p className="text-sm text-muted-foreground">
                                {selectedType.description}
                              </p>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No skin type selected</p>
                  )}
                </div>
              )}
            </div>

            {/* Skin Concerns Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Skin Concerns</h2>
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {skinConcerns.map((concern) => (
                    <div
                      key={concern.value}
                      className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent/5 transition-colors"
                    >
                      <Checkbox
                        id={concern.value}
                        checked={selectedConcerns.includes(concern.value)}
                        onCheckedChange={() => handleConcernToggle(concern.value)}
                      />
                      <label
                        htmlFor={concern.value}
                        className="text-sm font-medium cursor-pointer flex-1"
                      >
                        {concern.label}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 border-2 rounded-lg bg-muted/30">
                  {selectedConcerns.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedConcerns.map((concernValue) => {
                        const concern = skinConcerns.find(c => c.value === concernValue);
                        return concern ? (
                          <span
                            key={concernValue}
                            className="px-3 py-1 bg-accent/20 text-accent rounded-full text-sm"
                          >
                            {concern.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No concerns selected</p>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    fetchProfile(); // Reset to original values
                  }}
                  variant="outline"
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !skinType}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
};

export default Profile;
