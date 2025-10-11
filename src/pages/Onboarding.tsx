import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";
import welcomeImg from "@/assets/onboarding-welcome.jpg";
import shareImg from "@/assets/onboarding-share.jpg";
import findImg from "@/assets/onboarding-find.jpg";
import logo from "@/assets/logo.png";

const OnboardingScreen = ({ 
  image, 
  title, 
  subtitle, 
  index 
}: { 
  image: string; 
  title: string; 
  subtitle: string; 
  index: number;
}) => (
  <div className="flex flex-col items-center justify-center p-6 md:p-12 animate-fade-in">
    <div className="w-full max-w-2xl">
      <img 
        src={image} 
        alt={title}
        className="w-full h-64 md:h-80 object-cover rounded-2xl shadow-card mb-8"
      />
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
  const navigate = useNavigate();

  const screens = [
    {
      image: welcomeImg,
      title: "Building a Community That Cares",
      subtitle: "Connect with neighbors who share knowledge, skills, and help freely. Welcome to Care2Share.",
    },
    {
      image: shareImg,
      title: "Share Your Expertise",
      subtitle: "Offer your knowledge and skills in areas you're passionate about. Help others grow.",
    },
    {
      image: findImg,
      title: "Find the Help You Need",
      subtitle: "Connect with neighbors and friends for advice, services, and support—for free.",
    },
  ];

  const handleNext = () => {
    if (currentScreen < screens.length - 1) {
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
      <header className="p-6 flex justify-center">
        <img src={logo} alt="Care2Share" className="h-16 w-16" />
      </header>

      <main className="flex-1 flex flex-col justify-between">
        <div className="flex-1 flex items-center justify-center">
          <OnboardingScreen {...screens[currentScreen]} index={currentScreen} />
        </div>

        <div className="p-6 flex flex-col gap-4">
          <div className="flex justify-center gap-2 mb-4">
            {screens.map((_, index) => (
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
              {currentScreen === screens.length - 1 ? "Get Started" : "Next"}
              {currentScreen !== screens.length - 1 && (
                <ChevronRight className="ml-2 h-5 w-5" />
              )}
            </Button>
          </div>

          {currentScreen === screens.length - 1 && (
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
    </div>
  );
};

export default Onboarding;
