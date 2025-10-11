import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="bg-card border-t mt-auto">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground text-center md:text-left">
            © 2025 Care2Share. Created by vibedeveloper. All rights reserved.
          </div>
          <div className="flex gap-4 text-sm">
            <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
              Terms of Service
            </Link>
            <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <a 
              href="mailto:vibedeveloper@proton.me" 
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
