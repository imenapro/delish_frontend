import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { RegistrationData } from '@/pages/Register';
import { CheckCircle2, Store, Users, Package } from 'lucide-react';

interface WelcomeScreenProps {
  data: RegistrationData;
}

export function WelcomeScreen({ data }: WelcomeScreenProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(`/${data.businessSlug}/dashboard`);
    }, 10000);

    return () => clearTimeout(timer);
  }, [data.businessSlug, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full p-12 text-center space-y-8">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-bold mb-3">Welcome to Kazimas!</h1>
          <p className="text-lg text-muted-foreground">
            Your business "{data.businessName}" has been successfully created
          </p>
        </div>

        <Card className="p-6 bg-muted/50">
          <div className="space-y-3 text-left">
            <div className="flex items-center gap-3">
              <Store className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Your Business URL</p>
                <p className="text-sm text-muted-foreground">
                  kazimas.com/{data.businessSlug}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <div>
                <p className="font-medium">14-Day Free Trial Active</p>
                <p className="text-sm text-muted-foreground">
                  Full access to all features, no credit card required
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          <h3 className="font-semibold">Quick Setup Checklist</h3>
          <div className="grid gap-2 text-left">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="text-sm">Business created</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="text-sm">First location added</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Add products</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Invite team members</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            size="lg"
            onClick={() => navigate(`/${data.businessSlug}/dashboard`)}
            className="w-full"
          >
            Go to Dashboard
          </Button>
          <p className="text-sm text-muted-foreground">
            Redirecting automatically in 10 seconds...
          </p>
        </div>
      </Card>
    </div>
  );
}
