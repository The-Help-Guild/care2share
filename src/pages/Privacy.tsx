import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const Privacy = () => {
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
            <h1 className="text-xl font-bold text-primary">Privacy Policy</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 pb-20">
        <Card>
          <CardHeader>
            <CardTitle>Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground">Last updated: January 2025</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-4">
            <section>
              <h2 className="text-lg font-semibold mb-2">1. Introduction</h2>
              <p className="text-foreground leading-relaxed">
                This Privacy Policy explains how Care2Share ("we", "us", or "our") collects, uses, 
                and protects your personal information in compliance with the General Data Protection 
                Regulation (GDPR) and other applicable data protection laws.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">2. Data Controller</h2>
              <p className="text-foreground leading-relaxed">
                The data controller responsible for your personal information is vibedeveloper. 
                For any privacy-related inquiries, please contact:{" "}
                <a href="mailto:vibedeveloper@proton.me" className="text-primary hover:underline">
                  vibedeveloper@proton.me
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">3. Information We Collect</h2>
              <p className="text-foreground leading-relaxed mb-2">We collect the following types of information:</p>
              <ul className="list-disc list-inside space-y-1 text-foreground ml-4">
                <li><strong>Account Information:</strong> Name, email address, password (encrypted)</li>
                <li><strong>Profile Information:</strong> Bio, location, profile photo, areas of expertise, hobbies</li>
                <li><strong>User-Generated Content:</strong> Messages, posts, and other content you create</li>
                <li><strong>Usage Data:</strong> Information about how you use our service</li>
                <li><strong>Technical Data:</strong> IP address, browser type, device information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">4. Legal Basis for Processing</h2>
              <p className="text-foreground leading-relaxed mb-2">We process your data based on:</p>
              <ul className="list-disc list-inside space-y-1 text-foreground ml-4">
                <li><strong>Consent:</strong> You have given explicit consent for specific purposes</li>
                <li><strong>Contract:</strong> Processing is necessary to provide our services</li>
                <li><strong>Legal Obligation:</strong> We must comply with legal requirements</li>
                <li><strong>Legitimate Interest:</strong> Processing is necessary for our legitimate business interests</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">5. How We Use Your Information</h2>
              <p className="text-foreground leading-relaxed mb-2">Your information is used to:</p>
              <ul className="list-disc list-inside space-y-1 text-foreground ml-4">
                <li>Provide and maintain our services</li>
                <li>Enable communication between users</li>
                <li>Personalize your experience</li>
                <li>Improve our services and develop new features</li>
                <li>Send important service-related notifications</li>
                <li>Prevent fraud and ensure platform security</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">6. Data Sharing and Disclosure</h2>
              <p className="text-foreground leading-relaxed">
                We do not sell your personal information. We may share your data with:
              </p>
              <ul className="list-disc list-inside space-y-1 text-foreground ml-4">
                <li><strong>Other Users:</strong> Profile information you choose to make public</li>
                <li><strong>Service Providers:</strong> Third parties who help us operate our service (under strict confidentiality agreements)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect rights and safety</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">7. Your GDPR Rights</h2>
              <p className="text-foreground leading-relaxed mb-2">Under GDPR, you have the right to:</p>
              <ul className="list-disc list-inside space-y-1 text-foreground ml-4">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
                <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
                <li><strong>Restriction:</strong> Limit how we process your data</li>
                <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format</li>
                <li><strong>Object:</strong> Object to processing of your data</li>
                <li><strong>Withdraw Consent:</strong> Withdraw consent at any time</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-2">
                To exercise these rights, contact us at{" "}
                <a href="mailto:vibedeveloper@proton.me" className="text-primary hover:underline">
                  vibedeveloper@proton.me
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">8. Data Security</h2>
              <p className="text-foreground leading-relaxed">
                We implement appropriate technical and organizational measures to protect your data 
                against unauthorized access, alteration, disclosure, or destruction. This includes 
                encryption, secure servers, and regular security audits.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">9. Data Retention</h2>
              <p className="text-foreground leading-relaxed">
                We retain your personal data only for as long as necessary to provide our services 
                and comply with legal obligations. When you delete your account, we permanently 
                remove your data within 30 days, except where retention is required by law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">10. International Data Transfers</h2>
              <p className="text-foreground leading-relaxed">
                Your data may be transferred and processed in countries outside your jurisdiction. 
                We ensure appropriate safeguards are in place to protect your data in accordance 
                with GDPR requirements.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">11. Cookies and Tracking</h2>
              <p className="text-foreground leading-relaxed">
                We use essential cookies to maintain your session and provide core functionality. 
                We do not use tracking cookies or analytics without your consent.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">12. Children's Privacy</h2>
              <p className="text-foreground leading-relaxed">
                Our service is not intended for users under 16 years of age. We do not knowingly 
                collect personal information from children. If you believe we have inadvertently 
                collected such information, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">13. Changes to Privacy Policy</h2>
              <p className="text-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of 
                significant changes by email or through the service. Your continued use after 
                changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">14. Contact Us</h2>
              <p className="text-foreground leading-relaxed">
                For any questions, concerns, or requests regarding your privacy or this policy, 
                please contact us at:{" "}
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

export default Privacy;
