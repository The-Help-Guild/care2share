import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import UserMenu from "@/components/UserMenu";
import { NotificationCenter } from "@/components/NotificationCenter";

interface HeaderProps {
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

const Header = ({ title, children, className = "" }: HeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className={`bg-card border-b border-border sticky top-0 z-10 shadow-md ${className}`}>
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/home")}
              className="hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary rounded"
              aria-label="Go to home"
            >
              <img 
                src="/Care2Share.png" 
                alt="Care2Share" 
                className="h-20 md:h-24 w-auto object-contain"
              />
            </button>
            {title && (
              <h1 className="text-lg md:text-xl font-bold tracking-tight">
                {title}
              </h1>
            )}
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
        {children}
      </div>
    </header>
  );
};

export default Header;

