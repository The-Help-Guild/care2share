import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import welcomeImg from "@/assets/onboarding-welcome-optimized.jpg";
import welcomeImgWebp from "@/assets/onboarding-welcome-optimized.webp";
import shareImg from "@/assets/onboarding-share-optimized.jpg";
import shareImgWebp from "@/assets/onboarding-share-optimized.webp";
import findImg from "@/assets/onboarding-find-optimized.jpg";
import findImgWebp from "@/assets/onboarding-find-optimized.webp";
import logo from "/Care2Share.png";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import DOMPurify from "dompurify";

const OnboardingScreen = ({
  image, 
  imageWebp,
  title, 
  subtitle, 
  index 
}: { 
  image: string;
  imageWebp: string;
  title: string; 
  subtitle: string; 
  index: number;
}) => (
  <div className="flex flex-col items-center justify-center p-6 md:p-12 animate-fade-in">
    <div className="w-full max-w-2xl">
      <picture>
        <source srcSet={imageWebp} type="image/webp" />
        <img 
          src={image} 
          alt={title}
          width="800"
          height="480"
          loading={index === 0 ? "eager" : "lazy"}
          fetchPriority={index === 0 ? "high" : "auto"}
          className="w-full h-64 md:h-80 object-cover rounded-2xl shadow-card mb-8"
        />
      </picture>
      <h1 className="text-3xl md:text-4xl font-bold text-center mb-4 text-primary">
        {title}
      </h1>
      <p className="text-lg md:text-xl text-center text-muted-foreground">
        {subtitle}
      </p>
    </div>
  </div>
);

const Onboarding = () => {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [adminPost, setAdminPost] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAdminPost = async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles(full_name, profile_photo_url),
          domains(name, icon)
        `)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setAdminPost(data);
      }
    };

    fetchAdminPost();
  }, []);

  const screens = [
    {
      image: shareImg,
      imageWebp: shareImgWebp,
      title: "Share Your Expertise",
      subtitle: "Offer your knowledge and skills in areas you're passionate about. Help others grow.",
    },
    {
      image: findImg,
      imageWebp: findImgWebp,
      title: "Find the Help You Need",
      subtitle: "Connect with neighbors and friends for advice, services, and support—for free.",
    },
  ];

  const handleNext = () => {
    if (currentScreen < 2) {
      setCurrentScreen(currentScreen + 1);
    } else {
      navigate("/auth");
    }
  };

  const handlePrev = () => {
    if (currentScreen > 0) {
      setCurrentScreen(currentScreen - 1);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="p-6 flex justify-between items-center">
        <img src={logo} alt="Care2Share" width="128" height="128" className="h-16 w-16" />
        <ThemeToggle />
      </header>

      <main className="flex-1 flex flex-col justify-between">
        <div className="flex-1 flex items-center justify-center">
          {currentScreen === 0 && adminPost ? (
            <div className="flex flex-col items-center justify-center p-6 md:p-12 animate-fade-in">
              <div className="w-full max-w-2xl">
                <Card className="shadow-card">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      {adminPost.profiles?.profile_photo_url && (
                        <img
                          src={adminPost.profiles.profile_photo_url}
                          alt={adminPost.profiles.full_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <h3 className="font-semibold text-lg">
                          {adminPost.profiles?.full_name}
                        </h3>
                        {adminPost.domains && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            {adminPost.domains.icon && (
                              <span>{adminPost.domains.icon}</span>
                            )}
                            {adminPost.domains.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-4 text-primary">
                      {adminPost.title}
                    </h1>
                    <div
                      className="text-foreground prose prose-sm md:prose-base max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(adminPost.content),
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : currentScreen === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 md:p-12 animate-fade-in">
              <div className="w-full max-w-2xl">
                <picture>
                  <source srcSet={welcomeImgWebp} type="image/webp" />
                  <img 
                    src={welcomeImg} 
                    alt="Welcome to Care2Share"
                    width="800"
                    height="480"
                    loading="eager"
                    fetchPriority="high"
                    className="w-full h-64 md:h-80 object-cover rounded-2xl shadow-card mb-8"
                  />
                </picture>
                <h1 className="text-3xl md:text-4xl font-bold text-center mb-4 text-primary">
                  Building a Community That Cares
                </h1>
                <p className="text-lg md:text-xl text-center text-muted-foreground">
                  Connect with neighbors who share knowledge, skills, and help freely. Welcome to Care2Share.
                </p>
              </div>
            </div>
          ) : (
            <OnboardingScreen {...screens[currentScreen - 1]} index={currentScreen} />
          )}
        </div>

        <div className="p-6 flex flex-col gap-4">
          <div className="flex justify-center gap-2 mb-4">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentScreen
                    ? "w-8 bg-primary"
                    : "w-2 bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {currentScreen > 0 && (
              <Button
                variant="outline"
                size="lg"
                onClick={handlePrev}
                className="flex-1"
              >
                <ChevronLeft className="mr-2 h-5 w-5" />
                Back
              </Button>
            )}
            <Button
              size="lg"
              onClick={handleNext}
              className="flex-1"
            >
              {currentScreen === 2 ? "Get Started" : "Next"}
              {currentScreen !== 2 && (
                <ChevronRight className="ml-2 h-5 w-5" />
              )}
            </Button>
          </div>

          {currentScreen === 2 && (
            <Button
              variant="ghost"
              onClick={() => navigate("/auth?mode=login")}
              className="w-full"
            >
              Already have an account? Log in
            </Button>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Onboarding;
