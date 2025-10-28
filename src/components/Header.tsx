import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import UserMenu from "@/components/UserMenu";
import { NotificationCenter } from "@/components/NotificationCenter";
import logo from "@/assets/logo-optimized.png";

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
                src={logo} 
                alt="Care2Share" 
                className="h-10 w-auto object-contain"
              />
            </button>
            {title && (
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
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

