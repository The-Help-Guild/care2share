import { useNavigate, useLocation } from "react-router-dom";
import { Home, Search, MessageCircle, User, Shield, HelpCircle, MessageSquare, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/hooks/useAdmin";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAdmin();

  const baseNavItems = [
    { icon: Home, label: "Home", path: "/home" },
    { icon: MessageSquare, label: "Feed", path: "/feed" },
    { icon: Search, label: "Search", path: "/search" },
    { icon: Calendar, label: "Events", path: "/events" },
    { icon: HelpCircle, label: "Support", path: "/support" },
    { icon: MessageCircle, label: "Messages", path: "/messages" },
  ];

  // Add admin item only for admins
  const navItems = isAdmin 
    ? [...baseNavItems, { icon: Shield, label: "Admin", path: "/admin" }]
    : baseNavItems;

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-xl z-50">
      <div className="max-w-6xl mx-auto px-2 py-2.5 overflow-x-auto">
        <div className="flex justify-around items-center min-w-max">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Button
                key={item.path}
                variant="ghost"
                size="sm"
                className={`flex-1 flex flex-col items-center gap-1.5 h-auto py-3 transition-all duration-200 ${
                  active ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                onClick={() => navigate(item.path)}
              >
                <Icon className={`h-5 w-5 ${active ? "fill-current" : ""}`} />
                <span className="text-xs font-medium">{item.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
