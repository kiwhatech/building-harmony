import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, CheckCircle2, Users, DollarSign, Wrench, Bell } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { LanguageSelector } from "@/components/LanguageSelector";

const Index = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="absolute top-4 right-4"><LanguageSelector /></div>
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg">
            <Building2 className="h-10 w-10" />
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {t('landing.welcome')} <span className="text-primary">{t('landing.appName')}</span>
          </h1>
          <p className="mb-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">{t('landing.subtitle')}</p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button asChild size="lg" className="text-lg px-8"><Link to="/auth">{t('landing.getStarted')}</Link></Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8"><Link to="/auth">{t('landing.signIn')}</Link></Button>
          </div>
        </div>

        <div className="mt-24 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Building2, color: 'primary', titleKey: 'landing.features.multiBuilding.title', descKey: 'landing.features.multiBuilding.desc' },
            { icon: DollarSign, color: 'accent', titleKey: 'landing.features.feeManagement.title', descKey: 'landing.features.feeManagement.desc' },
            { icon: Wrench, color: 'info', titleKey: 'landing.features.maintenance.title', descKey: 'landing.features.maintenance.desc' },
            { icon: Users, color: 'success', titleKey: 'landing.features.roles.title', descKey: 'landing.features.roles.desc' },
            { icon: Bell, color: 'warning', titleKey: 'landing.features.notifications.title', descKey: 'landing.features.notifications.desc' },
            { icon: CheckCircle2, color: 'secondary', titleKey: 'landing.features.reports.title', descKey: 'landing.features.reports.desc' },
          ].map((feature, i) => (
            <div key={i} className="rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
              <div className={`mb-4 inline-flex rounded-xl bg-${feature.color}/10 p-3`}>
                <feature.icon className={`h-6 w-6 text-${feature.color}`} />
              </div>
              <h3 className="mb-2 text-xl font-semibold">{t(feature.titleKey)}</h3>
              <p className="text-muted-foreground">{t(feature.descKey)}</p>
            </div>
          ))}
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
    </div>
  );
};

export default Index;
