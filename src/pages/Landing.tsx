import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { 
  Store, 
  ShoppingCart, 
  Users, 
  BarChart3, 
  Package, 
  Truck,
  Clock,
  Shield,
  Zap,
  CheckCircle2,
  Coffee,
  Home,
  Laptop,
  Printer,
  Briefcase
} from 'lucide-react';
import { BusinessTypeCard } from '@/components/landing/BusinessTypeCard';

export default function Landing() {
  const navigate = useNavigate();

  const features = [
    {
      icon: ShoppingCart,
      title: 'Universal POS',
      description: 'Fast, intuitive POS system with barcode scanning and receipt printing'
    },
    {
      icon: Package,
      title: 'Product & Stock Management',
      description: 'Track products, stock levels, and inventory in real-time'
    },
    {
      icon: Store,
      title: 'Multi-Store Support',
      description: 'Manage multiple locations from a single dashboard'
    },
    {
      icon: Users,
      title: 'Staff Management',
      description: 'Schedule shifts, track time, and manage employee permissions'
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reports',
      description: 'Detailed insights into sales, revenue, and business performance'
    },
    {
      icon: Truck,
      title: 'Delivery Tracking',
      description: 'Manage orders and track deliveries in real-time'
    }
  ];

  const benefits = [
    'Cloud-based - Access anywhere, anytime',
    'Multi-tenant architecture for scalability',
    'Real-time sync across all devices',
    'Secure payment processing',
    'Custom branding per store',
    'Mobile-responsive design'
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">Kazimas</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
              <Button onClick={() => navigate('/register')}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
        <div className="container mx-auto px-6 py-24 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Zap className="h-4 w-4" />
              Complete Business Management Solution
            </div>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              Run Any Business with
              <span className="text-primary"> Confidence</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage sales, inventory, staff, and multiple locations. Built for any retail or service business.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" onClick={() => navigate('/register')} className="text-lg">
                Start Free Trial
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/super-admin')}>
                View Demo
              </Button>
            </div>
            <div className="flex items-center justify-center gap-6 pt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Secure & Compliant
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                24/7 Support
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Quick Setup
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Business Types Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Perfect for Any Business
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From retail stores to restaurants, Kazimas adapts to your needs
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            <BusinessTypeCard icon={Store} label="Retail & Grocery" />
            <BusinessTypeCard icon={Coffee} label="Restaurants" />
            <BusinessTypeCard icon={Package} label="Smoke Shops" />
            <BusinessTypeCard icon={ShoppingCart} label="Butcher Shops" />
            <BusinessTypeCard icon={Printer} label="Printing" />
            <BusinessTypeCard icon={Laptop} label="Electronics" />
            <BusinessTypeCard icon={Home} label="Home Décor" />
            <BusinessTypeCard icon={Briefcase} label="Services" />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed for modern businesses
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Why Choose Kazimas?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Built from the ground up to handle the unique challenges of running a retail or service business. Our platform grows with you.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-lg">{benefit}</span>
                  </div>
                ))}
              </div>
              <Button size="lg" className="mt-8" onClick={() => navigate('/register')}>
                Start Your Free Trial
              </Button>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <div className="text-center">
                  <Store className="h-32 w-32 text-primary/40 mx-auto mb-4" />
                  <p className="text-muted-foreground">Business Dashboard Preview</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join hundreds of businesses already using Kazimas to streamline operations and boost profits
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            className="text-lg"
            onClick={() => navigate('/register')}
          >
            Get Started Today
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-card">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Store className="h-6 w-6 text-primary" />
              <span className="font-bold">Kazimas</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Kazimas. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
