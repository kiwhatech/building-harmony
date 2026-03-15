import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Users, DollarSign, Wrench, Bell, Building2 } from "lucide-react";
import harmonyLogo from "@/assets/harmony-logo.jpg";
import { useLanguage } from "@/hooks/useLanguage";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Index = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  const handleVerify = () => {
    if (verificationCode === "qA0USU2DAn") {
      setShowCodeDialog(false);
      setVerificationCode("");
      navigate("/auth");
    } else {
      toast.error("Invalid verification code");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="absolute top-4 right-4"><LanguageSelector /></div>
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-[#ffa800] bg-white p-1">
            <img src={harmonyLogo} alt="Harmony Logo" className="h-full w-full object-contain rounded-2xl" />
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {t('landing.welcome')} <span className="text-[#ffaa00]">{t('landing.appName')}</span>
          </h1>
          <p className="mb-8 max-w-2xl text-lg text-muted-foreground sm:text-xl whitespace-pre-line">{t('landing.subtitle')}</p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button asChild size="lg" className="text-lg px-8"><Link to="/auth">{t('landing.getStarted')}</Link></Button>
            <Button size="lg" variant="outline" className="text-lg px-8" onClick={() => setShowCodeDialog(true)}>{t('landing.signIn')}</Button>
          </div>
        </div>

        <div className="mt-24 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[
          { icon: Building2, color: 'primary', titleKey: 'landing.features.multiBuilding.title', descKey: 'landing.features.multiBuilding.desc' },
          { icon: DollarSign, color: 'accent', titleKey: 'landing.features.feeManagement.title', descKey: 'landing.features.feeManagement.desc' },
          { icon: Wrench, color: 'info', titleKey: 'landing.features.maintenance.title', descKey: 'landing.features.maintenance.desc' },
          { icon: Users, color: 'success', titleKey: 'landing.features.roles.title', descKey: 'landing.features.roles.desc' },
          { icon: Bell, color: 'warning', titleKey: 'landing.features.notifications.title', descKey: 'landing.features.notifications.desc' },
          { icon: CheckCircle2, color: 'secondary', titleKey: 'landing.features.reports.title', descKey: 'landing.features.reports.desc' }].
          map((feature, i) =>
          <div key={i} className="rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
              <div className={`mb-4 inline-flex rounded-xl bg-${feature.color}/10 p-3`}>
                <feature.icon className={`h-6 w-6 text-${feature.color}`} />
              </div>
              <h3 className="mb-2 text-xl font-semibold">{t(feature.titleKey)}</h3>
              <p className="text-muted-foreground">{t(feature.descKey)}</p>
            </div>
          )}
        </div>

        <div className="mt-24 rounded-3xl bg-primary p-8 text-center text-primary-foreground sm:p-12">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">{t('landing.cta.title')}</h2>
          <p className="mb-8 text-lg opacity-90">{t('landing.cta.subtitle')}</p>
          <Button asChild size="lg" variant="secondary" className="text-lg px-8"><Link to="/auth">{t('landing.cta.button')}</Link></Button>
        </div>
      </div>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>{t('landing.footer')}</p>
        </div>
      </footer>

      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verification Required</DialogTitle>
            <DialogDescription>Enter your verification code to sign in.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="verification-code">Verification Code</Label>
            <Input
              id="verification-code"
              type="password"
              placeholder="Enter code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()} />
            
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCodeDialog(false)}>Cancel</Button>
            <Button onClick={handleVerify}>Verify</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

};

export default Index;