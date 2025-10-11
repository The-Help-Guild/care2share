import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-primary">Terms of Service</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 pb-20">
        <Card>
          <CardHeader>
            <CardTitle>Terms of Service</CardTitle>
            <p className="text-sm text-muted-foreground">Last updated: January 2025</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-4">
            <section>
              <h2 className="text-lg font-semibold mb-2">1. Agreement to Terms</h2>
              <p className="text-foreground leading-relaxed">
                By accessing and using Care2Share, you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use our service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">2. Description of Service</h2>
              <p className="text-foreground leading-relaxed">
                Care2Share is a community platform that connects people to share knowledge, skills, 
                and help freely. The service allows users to create profiles, search for expertise, 
                and communicate with other users.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">3. User Responsibilities</h2>
              <p className="text-foreground leading-relaxed mb-2">You agree to:</p>
              <ul className="list-disc list-inside space-y-1 text-foreground ml-4">
                <li>Provide accurate and truthful information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Use the service respectfully and lawfully</li>
                <li>Not impersonate others or create fake accounts</li>
                <li>Not use the service for commercial purposes without authorization</li>
                <li>Not engage in harassment, spam, or abuse</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">4. Content and Conduct</h2>
              <p className="text-foreground leading-relaxed">
                Users are responsible for the content they post. We reserve the right to remove 
                content that violates these terms or applicable laws. You grant us a license to 
                use, display, and distribute your content as necessary to provide the service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">5. Privacy and Data Protection</h2>
              <p className="text-foreground leading-relaxed">
                Your use of Care2Share is also governed by our Privacy Policy. We process your 
                data in accordance with GDPR and other applicable data protection regulations.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">6. Account Termination</h2>
              <p className="text-foreground leading-relaxed">
                You may delete your account at any time through your profile settings. We may 
                suspend or terminate accounts that violate these terms. Upon termination, your 
                data will be deleted in accordance with GDPR regulations.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">7. Limitation of Liability</h2>
              <p className="text-foreground leading-relaxed">
                Care2Share is provided "as is" without warranties of any kind. We are not liable 
                for any damages arising from your use of the service. Users interact at their own 
                risk, and we do not guarantee the accuracy of information shared by users.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">8. Changes to Terms</h2>
              <p className="text-foreground leading-relaxed">
                We reserve the right to modify these terms at any time. Users will be notified 
                of significant changes, and continued use of the service constitutes acceptance 
                of the updated terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">9. Contact Information</h2>
              <p className="text-foreground leading-relaxed">
                For questions about these Terms of Service, please contact us at:{" "}
                <a href="mailto:vibedeveloper@proton.me" className="text-primary hover:underline">
                  vibedeveloper@proton.me
                </a>
              </p>
            </section>

            <section className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                © 2025 Care2Share. Created by vibedeveloper. All rights reserved.
              </p>
            </section>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Terms;
