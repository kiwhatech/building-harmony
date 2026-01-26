import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Building2, CheckCircle2, Users, DollarSign, Wrench, Bell } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center text-center">
          {/* Logo */}
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg">
            <Building2 className="h-10 w-10" />
          </div>
          
          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Welcome to <span className="text-primary">CondoManager</span>
          </h1>
          
          <p className="mb-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            The all-in-one platform for condominium management. Simplify fees, maintenance, 
            and communication between administrators, residents, and service providers.
          </p>
          
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button asChild size="lg" className="text-lg px-8">
              <Link to="/auth">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8">
              <Link to="/auth">Sign In</Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-24 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Multi-Building Support</h3>
            <p className="text-muted-foreground">
              Manage multiple condominiums and buildings from a single dashboard. Track units, residents, and more.
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="mb-4 inline-flex rounded-xl bg-accent/10 p-3">
              <DollarSign className="h-6 w-6 text-accent" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Fee Management</h3>
            <p className="text-muted-foreground">
              Track payments, outstanding balances, and generate financial reports. Send automatic payment reminders.
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="mb-4 inline-flex rounded-xl bg-info/10 p-3">
              <Wrench className="h-6 w-6 text-info" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Maintenance Tracking</h3>
            <p className="text-muted-foreground">
              Submit and track maintenance requests. Manage estimates from service providers with full status visibility.
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="mb-4 inline-flex rounded-xl bg-success/10 p-3">
              <Users className="h-6 w-6 text-success" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Role-Based Access</h3>
            <p className="text-muted-foreground">
              Different portals for administrators, residents, and service providers. Each sees what they need.
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="mb-4 inline-flex rounded-xl bg-warning/10 p-3">
              <Bell className="h-6 w-6 text-warning" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Notifications</h3>
            <p className="text-muted-foreground">
              Stay informed with in-app, email, and push notifications. Never miss an important update.
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="mb-4 inline-flex rounded-xl bg-secondary p-3">
              <CheckCircle2 className="h-6 w-6 text-secondary-foreground" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Reports & Analytics</h3>
            <p className="text-muted-foreground">
              Generate detailed financial reports, expense tracking by category, and export to PDF or Excel.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 rounded-3xl bg-primary p-8 text-center text-primary-foreground sm:p-12">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
            Ready to streamline your condo management?
          </h2>
          <p className="mb-8 text-lg opacity-90">
            Join thousands of condominiums already using CondoManager to simplify their operations.
          </p>
          <Button asChild size="lg" variant="secondary" className="text-lg px-8">
            <Link to="/auth">Start Free Today</Link>
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 CondoManager. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
