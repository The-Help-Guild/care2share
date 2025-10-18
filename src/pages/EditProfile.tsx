import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import imageCompression from "browser-image-compression";
import { EmojiPickerComponent } from "@/components/EmojiPicker";
import { MapboxLocationPicker } from "@/components/MapboxLocationPicker";

const EditProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Profile data
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState<{
    address: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [resume, setResume] = useState<File | null>(null);
  const [existingResumeUrl, setExistingResumeUrl] = useState("");
  
  // Domains and tags
  const [availableDomains, setAvailableDomains] = useState<any[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [expertiseTags, setExpertiseTags] = useState<string[]>([]);
  const [hobbyTags, setHobbyTags] = useState<string[]>([]);
  const [newExpertiseTag, setNewExpertiseTag] = useState("");
  const [newHobbyTag, setNewHobbyTag] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      setCurrentUserId(session.user.id);

      // Load profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name || "");
        setBio(profile.bio || "");
        
        // Parse location - handle both old string format and new JSON format
        if (profile.location) {
          try {
            const parsedLocation = JSON.parse(profile.location);
            if (parsedLocation.address && parsedLocation.latitude && parsedLocation.longitude) {
              setLocation(parsedLocation);
            } else {
              // Old format: plain string - convert to new format with default coords
              setLocation({
                address: profile.location,
                latitude: 37.7749,
                longitude: -122.4194,
              });
            }
          } catch {
            // Old format: plain string - convert to new format with default coords
            setLocation({
              address: profile.location,
              latitude: 37.7749,
              longitude: -122.4194,
            });
          }
        }
        
        setProfilePhotoUrl(profile.profile_photo_url || "");
        setExistingResumeUrl(profile.resume_url || "");
      }

      // Load domains
      const { data: domains } = await supabase
        .from("domains")
        .select("*")
        .order("name");

      if (domains) setAvailableDomains(domains);

      // Load selected domains
      const { data: profileDomains } = await supabase
        .from("profile_domains")
        .select("domain_id")
        .eq("profile_id", session.user.id);

      if (profileDomains) {
        setSelectedDomains(profileDomains.map(pd => pd.domain_id));
      }

      // Load expertise tags
      const { data: expertise } = await supabase
        .from("expertise_tags")
        .select("tag")
        .eq("profile_id", session.user.id);

      if (expertise) setExpertiseTags(expertise.map(e => e.tag));

      // Load hobby tags
      const { data: hobbies } = await supabase
        .from("hobby_tags")
        .select("tag")
        .eq("profile_id", session.user.id);

      if (hobbies) setHobbyTags(hobbies.map(h => h.tag));

      setLoading(false);
    };

    loadProfile();
  }, [navigate]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Rate limit check for file uploads
      if (currentUserId) {
        const { checkRateLimit } = await import('@/lib/rateLimit');
        const rateLimitCheck = await checkRateLimit(currentUserId, 'file_upload');
        if (!rateLimitCheck.allowed) {
          toast.error(`Too many file uploads. Please wait ${Math.ceil((rateLimitCheck.remainingTime || 3600) / 60)} minutes before trying again.`);
          return;
        }
      }
      
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }

      setProfilePhoto(file);
      setProfilePhotoUrl(URL.createObjectURL(file));
    }
  };

  const handleResumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Rate limit check for file uploads
      if (currentUserId) {
        const { checkRateLimit } = await import('@/lib/rateLimit');
        const rateLimitCheck = await checkRateLimit(currentUserId, 'file_upload');
        if (!rateLimitCheck.allowed) {
          toast.error(`Too many file uploads. Please wait ${Math.ceil((rateLimitCheck.remainingTime || 3600) / 60)} minutes before trying again.`);
          return;
        }
      }
      
      if (file.type !== "application/pdf") {
        toast.error("Please select a PDF file");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error("Resume must be less than 10MB");
        return;
      }

      setResume(file);
    }
  };

  const addExpertiseTag = () => {
    if (newExpertiseTag.trim() && !expertiseTags.includes(newExpertiseTag.trim())) {
      setExpertiseTags([...expertiseTags, newExpertiseTag.trim()]);
      setNewExpertiseTag("");
    }
  };

  const removeExpertiseTag = (tag: string) => {
    setExpertiseTags(expertiseTags.filter(t => t !== tag));
  };

  const addHobbyTag = () => {
    if (newHobbyTag.trim() && !hobbyTags.includes(newHobbyTag.trim())) {
      setHobbyTags([...hobbyTags, newHobbyTag.trim()]);
      setNewHobbyTag("");
    }
  };

  const removeHobbyTag = (tag: string) => {
    setHobbyTags(hobbyTags.filter(t => t !== tag));
  };

  const handleSave = async () => {
    if (!currentUserId) return;

    setSaving(true);
    try {
      // Rate limit check
      const { checkRateLimit } = await import('@/lib/rateLimit');
      const rateLimitCheck = await checkRateLimit(currentUserId, 'profile_update');
      if (!rateLimitCheck.allowed) {
        toast.error(`You've updated your profile too many times. Please wait ${Math.ceil((rateLimitCheck.remainingTime || 3600) / 60)} minutes before trying again.`);
        setSaving(false);
        return;
      }

      let photoUrl = profilePhotoUrl;
      let resumeUrl = existingResumeUrl;

      // Upload profile photo with compression
      if (profilePhoto) {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 800,
          useWebWorker: true
        };
        
        const compressedFile = await imageCompression(profilePhoto, options);
        const photoPath = `${currentUserId}/${Date.now()}_${profilePhoto.name}`;
        
        const { error: photoError } = await supabase.storage
          .from("profile-photos")
          .upload(photoPath, compressedFile);

        if (photoError) throw photoError;

        const { data: { publicUrl } } = supabase.storage
          .from("profile-photos")
          .getPublicUrl(photoPath);

        photoUrl = publicUrl;
      }

      // Upload resume
      if (resume) {
        const resumePath = `${currentUserId}/${Date.now()}_${resume.name}`;
        
        const { error: resumeError } = await supabase.storage
          .from("resumes")
          .upload(resumePath, resume);

        if (resumeError) throw resumeError;

        resumeUrl = resumePath;
      }

      // Upsert profile (insert or update)
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: currentUserId,
          email: (await supabase.auth.getUser()).data.user?.email || '',
          full_name: fullName,
          bio: bio,
          location: location ? JSON.stringify(location) : null,
          profile_photo_url: photoUrl,
          resume_url: resumeUrl,
        }, {
          onConflict: 'id'
        });

      if (profileError) throw profileError;

      // Update domains
      await supabase.from("profile_domains").delete().eq("profile_id", currentUserId);
      
      if (selectedDomains.length > 0) {
        const { error: domainsError } = await supabase
          .from("profile_domains")
          .insert(selectedDomains.map(domainId => ({
            profile_id: currentUserId,
            domain_id: domainId
          })));

        if (domainsError) throw domainsError;
      }

      // Update expertise tags
      await supabase.from("expertise_tags").delete().eq("profile_id", currentUserId);
      
      if (expertiseTags.length > 0) {
        const { error: expertiseError } = await supabase
          .from("expertise_tags")
          .insert(expertiseTags.map(tag => ({
            profile_id: currentUserId,
            tag: tag
          })));

        if (expertiseError) throw expertiseError;
      }

      // Update hobby tags
      await supabase.from("hobby_tags").delete().eq("profile_id", currentUserId);
      
      if (hobbyTags.length > 0) {
        const { error: hobbyError } = await supabase
          .from("hobby_tags")
          .insert(hobbyTags.map(tag => ({
            profile_id: currentUserId,
            tag: tag
          })));

        if (hobbyError) throw hobbyError;
      }

      toast.success("Profile updated successfully!");
      navigate(`/profile/${currentUserId}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto p-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-primary flex-1">Edit Profile</h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Photo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profilePhotoUrl} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {getInitials(fullName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <Label htmlFor="photo" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                    <Upload className="h-4 w-4" />
                    Choose Photo
                  </div>
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </Label>
                <p className="text-xs text-muted-foreground mt-2">
                  Max 5MB. Image will be compressed automatically.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                maxLength={100}
              />
            </div>

            <div>
              <MapboxLocationPicker
                initialLocation={location}
                onChange={setLocation}
                label="Location"
              />
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <div className="relative">
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  maxLength={1000}
                  rows={5}
                  className="pr-12"
                />
                <div className="absolute bottom-2 right-2">
                  <EmojiPickerComponent
                    onEmojiSelect={(emoji) => setBio(bio + emoji)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {bio.length}/1000 characters
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expertise Domains</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availableDomains.map((domain) => (
                <div key={domain.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={domain.id}
                    checked={selectedDomains.includes(domain.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedDomains([...selectedDomains, domain.id]);
                      } else {
                        setSelectedDomains(selectedDomains.filter(id => id !== domain.id));
                      }
                    }}
                  />
                  <Label htmlFor={domain.id} className="cursor-pointer">
                    {domain.name}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expertise Tags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newExpertiseTag}
                onChange={(e) => setNewExpertiseTag(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addExpertiseTag()}
                placeholder="e.g., Python, Marketing"
                maxLength={50}
              />
              <Button onClick={addExpertiseTag} type="button">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {expertiseTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeExpertiseTag(tag)}
                  />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hobbies & Interests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newHobbyTag}
                onChange={(e) => setNewHobbyTag(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addHobbyTag()}
                placeholder="e.g., Photography, Hiking"
                maxLength={50}
              />
              <Button onClick={addHobbyTag} type="button">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {hobbyTags.map((tag) => (
                <Badge key={tag} variant="outline" className="gap-1">
                  {tag}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeHobbyTag(tag)}
                  />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resume (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {existingResumeUrl && (
              <p className="text-sm text-muted-foreground">
                Current resume uploaded: {existingResumeUrl.split('/').pop()}
              </p>
            )}
            <div>
              <Label htmlFor="resume" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 w-fit">
                  <Upload className="h-4 w-4" />
                  {resume ? resume.name : "Choose Resume (PDF)"}
                </div>
                <Input
                  id="resume"
                  type="file"
                  accept="application/pdf"
                  onChange={handleResumeChange}
                  className="hidden"
                />
              </Label>
              <p className="text-xs text-muted-foreground mt-2">
                Max 10MB. PDF format only.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !fullName.trim()}
            className="flex-1"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default EditProfile;
