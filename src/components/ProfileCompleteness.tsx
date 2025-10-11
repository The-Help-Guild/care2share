import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle } from "lucide-react";

interface ProfileCompletenessProps {
  profile: {
    full_name?: string;
    bio?: string;
    location?: string;
    profile_photo_url?: string;
    resume_url?: string;
  };
  domains?: any[];
  expertiseTags?: any[];
  hobbyTags?: any[];
}

export const ProfileCompleteness = ({ 
  profile, 
  domains = [], 
  expertiseTags = [], 
  hobbyTags = [] 
}: ProfileCompletenessProps) => {
  const steps = [
    { label: "Full Name", completed: !!profile?.full_name },
    { label: "Profile Photo", completed: !!profile?.profile_photo_url },
    { label: "Bio", completed: !!profile?.bio && profile.bio.length > 20 },
    { label: "Location", completed: !!profile?.location },
    { label: "Expertise Domains", completed: domains.length > 0 },
    { label: "Expertise Tags", completed: expertiseTags.length >= 3 },
    { label: "Hobbies", completed: hobbyTags.length >= 2 },
    { label: "Resume (Optional)", completed: !!profile?.resume_url },
  ];

  const completedSteps = steps.filter(s => s.completed).length;
  const requiredSteps = steps.length - 1; // Resume is optional
  const percentage = Math.round((completedSteps / steps.length) * 100);

  if (percentage === 100) return null;

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Profile Completeness</h3>
            <span className="text-sm text-muted-foreground">{percentage}%</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>
        
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              {step.completed ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={step.completed ? "text-foreground" : "text-muted-foreground"}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
