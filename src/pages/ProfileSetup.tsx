import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Upload, X, CheckCircle } from "lucide-react";
import { z } from "zod";

const profileSchema = z.object({
  bio: z.string().max(1000, { message: "Bio must be less than 1000 characters" }).optional(),
});

const ProfileSetup = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  // Step 1: Profile Photo
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");

  // Step 2: Domains
  const [domains, setDomains] = useState<any[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);

  // Step 3: Bio & Tags
  const [bio, setBio] = useState("");
  const [expertiseInput, setExpertiseInput] = useState("");
  const [expertiseTags, setExpertiseTags] = useState<string[]>([]);
  const [hobbyInput, setHobbyInput] = useState("");
  const [hobbyTags, setHobbyTags] = useState<string[]>([]);

  // Step 4: Resume
  const [resume, setResume] = useState<File | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      
      // Check if profile already exists
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      
      if (profile) {
        navigate("/home");
      }
    };

    const loadDomains = async () => {
      const { data } = await supabase
        .from("domains")
        .select("*")
        .order("name");
      if (data) setDomains(data);
    };

    checkAuth();
    loadDomains();
  }, [navigate]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Photo must be less than 5MB");
        return;
      }
      if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
        toast.error("Please upload a JPEG or PNG image");
        return;
      }
      setProfilePhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Resume must be less than 10MB");
        return;
      }
      if (!["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(file.type)) {
        toast.error("Please upload a PDF or DOCX file");
        return;
      }
      setResume(file);
    }
  };

  const addTag = (value: string, type: "expertise" | "hobby") => {
    const trimmed = value.trim();
    if (!trimmed) return;
    
    if (type === "expertise") {
      if (!expertiseTags.includes(trimmed)) {
        setExpertiseTags([...expertiseTags, trimmed]);
        setExpertiseInput("");
      }
    } else {
      if (!hobbyTags.includes(trimmed)) {
        setHobbyTags([...hobbyTags, trimmed]);
        setHobbyInput("");
      }
    }
  };

  const removeTag = (tag: string, type: "expertise" | "hobby") => {
    if (type === "expertise") {
      setExpertiseTags(expertiseTags.filter(t => t !== tag));
    } else {
      setHobbyTags(hobbyTags.filter(t => t !== tag));
    }
  };

  const handleNext = async () => {
    if (step === 2 && selectedDomains.length === 0) {
      toast.error("Please select at least one domain");
      return;
    }

    if (step === 3) {
      const result = profileSchema.safeParse({ bio });
      if (!result.success) {
        toast.error(result.error.errors[0].message);
        return;
      }
    }

    if (step < 4) {
      setStep(step + 1);
    } else {
      await handleSubmit();
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      if (!user) return;

      let photoUrl = "";
      let resumeUrl = "";

      // Upload profile photo
      if (profilePhoto) {
        const photoPath = `${user.id}/${Date.now()}_${profilePhoto.name}`;
        const { error: photoError } = await supabase.storage
          .from("profile-photos")
          .upload(photoPath, profilePhoto);

        if (photoError) throw photoError;

        const { data: { publicUrl } } = supabase.storage
          .from("profile-photos")
          .getPublicUrl(photoPath);
        
        photoUrl = publicUrl;
      }

      // Upload resume
      if (resume) {
        const resumePath = `${user.id}/${Date.now()}_${resume.name}`;
        const { error: resumeError } = await supabase.storage
          .from("resumes")
          .upload(resumePath, resume);

        if (resumeError) throw resumeError;
        resumeUrl = resumePath;
      }

      // Create profile
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          full_name: user.user_metadata.full_name || user.email?.split("@")[0] || "",
          email: user.email!,
          bio: bio || null,
          profile_photo_url: photoUrl || null,
          resume_url: resumeUrl || null,
        });

      if (profileError) throw profileError;

      // Insert selected domains
      const domainInserts = selectedDomains.map(domainId => ({
        profile_id: user.id,
        domain_id: domainId,
      }));

      const { error: domainsError } = await supabase
        .from("profile_domains")
        .insert(domainInserts);

      if (domainsError) throw domainsError;

      // Insert expertise tags
      if (expertiseTags.length > 0) {
        const expertiseInserts = expertiseTags.map(tag => ({
          profile_id: user.id,
          tag,
        }));

        const { error: expertiseError } = await supabase
          .from("expertise_tags")
          .insert(expertiseInserts);

        if (expertiseError) throw expertiseError;
      }

      // Insert hobby tags
      if (hobbyTags.length > 0) {
        const hobbyInserts = hobbyTags.map(tag => ({
          profile_id: user.id,
          tag,
        }));

        const { error: hobbyError } = await supabase
          .from("hobby_tags")
          .insert(hobbyInserts);

        if (hobbyError) throw hobbyError;
      }

      toast.success("Profile created successfully!");
      navigate("/home");
    } catch (error: any) {
      toast.error(error.message || "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-primary">Setup Your Profile</h1>
            <span className="text-sm text-muted-foreground">Step {step} of 4</span>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full transition-all ${
                  s <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="bg-card p-8 rounded-2xl shadow-card">
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Profile Photo</h2>
                <p className="text-muted-foreground">
                  Add a photo so people can recognize you
                </p>
              </div>

              <div className="flex flex-col items-center gap-4">
                {photoPreview ? (
                  <div className="relative">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="h-40 w-40 rounded-full object-cover shadow-card"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute -top-2 -right-2 rounded-full"
                      onClick={() => {
                        setProfilePhoto(null);
                        setPhotoPreview("");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="h-40 w-40 rounded-full bg-muted flex items-center justify-center">
                    <Upload className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}

                <Label htmlFor="photo" className="cursor-pointer">
                  <div className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                    Choose Photo
                  </div>
                  <Input
                    id="photo"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </Label>
                <p className="text-xs text-muted-foreground">
                  JPEG or PNG, max 5MB
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Select Your Domains</h2>
                <p className="text-muted-foreground">
                  Choose at least one area where you can help others
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto p-2">
                {domains.map((domain) => (
                  <div
                    key={domain.id}
                    className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <Checkbox
                      id={domain.id}
                      checked={selectedDomains.includes(domain.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedDomains([...selectedDomains, domain.id]);
                        } else {
                          setSelectedDomains(
                            selectedDomains.filter((id) => id !== domain.id)
                          );
                        }
                      }}
                    />
                    <Label
                      htmlFor={domain.id}
                      className="flex-1 cursor-pointer font-normal"
                    >
                      {domain.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Tell Us About Yourself</h2>
                <p className="text-muted-foreground">
                  Share your background, expertise, and interests
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell people about yourself..."
                    rows={4}
                    maxLength={1000}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {bio.length}/1000 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="expertise">Areas of Expertise</Label>
                  <div className="flex gap-2">
                    <Input
                      id="expertise"
                      value={expertiseInput}
                      onChange={(e) => setExpertiseInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag(expertiseInput, "expertise");
                        }
                      }}
                      placeholder="e.g., Java, Public Speaking"
                    />
                    <Button
                      type="button"
                      onClick={() => addTag(expertiseInput, "expertise")}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {expertiseTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeTag(tag, "expertise")}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="hobbies">Hobbies & Passions</Label>
                  <div className="flex gap-2">
                    <Input
                      id="hobbies"
                      value={hobbyInput}
                      onChange={(e) => setHobbyInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag(hobbyInput, "hobby");
                        }
                      }}
                      placeholder="e.g., Hiking, Photography"
                    />
                    <Button
                      type="button"
                      onClick={() => addTag(hobbyInput, "hobby")}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {hobbyTags.map((tag) => (
                      <Badge key={tag} variant="outline" className="gap-1">
                        {tag}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeTag(tag, "hobby")}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Upload Resume (Optional)</h2>
                <p className="text-muted-foreground">
                  Add your resume or portfolio to showcase your experience
                </p>
              </div>

              <div className="flex flex-col items-center gap-4">
                {resume ? (
                  <div className="flex items-center gap-3 p-4 bg-muted rounded-lg w-full">
                    <CheckCircle className="h-5 w-5 text-secondary" />
                    <span className="flex-1 truncate">{resume.name}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setResume(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Label htmlFor="resume" className="cursor-pointer w-full">
                    <div className="border-2 border-dashed border-border rounded-lg p-8 hover:border-primary transition-colors text-center">
                      <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm font-medium mb-1">
                        Click to upload resume
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF or DOCX, max 10MB
                      </p>
                    </div>
                    <Input
                      id="resume"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleResumeChange}
                      className="hidden"
                    />
                  </Label>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={loading}
                className="flex-1"
              >
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={loading}
              className="flex-1"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {step === 4 ? "Complete Profile" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
