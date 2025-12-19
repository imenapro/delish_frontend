import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Store, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AccountCreationStep } from '@/components/register/AccountCreationStep';
import { BusinessSetupStep } from '@/components/register/BusinessSetupStep';
import { BrandingCustomizationStep } from '@/components/register/BrandingCustomizationStep';
import { LocationSetupStep } from '@/components/register/LocationSetupStep';
import { QuickStartStep } from '@/components/register/QuickStartStep';
import { WelcomeScreen } from '@/components/register/WelcomeScreen';
import { StepIndicator } from '@/components/register/StepIndicator';

export interface RegistrationData {
  // Step 1: Account
  email: string;
  password: string;
  fullName: string;
  phone: string;
  
  // Step 2: Business
  businessName: string;
  businessType: string;
  businessSlug: string;
  country: string;
  timezone: string;
  
  // Step 3: Branding
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  slogan?: string;
  
  // Step 4: Location
  shops: Array<{
    shopName: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
  }>;
  
  // Step 5: Products
  products?: Array<{
    name: string;
    category: string;
    price: number;
    stock: number;
  }>;
}

export default function Register() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [registrationData, setRegistrationData] = useState<Partial<RegistrationData>>({
    primaryColor: '#8B4513',
    secondaryColor: '#F5DEB3',
    shops: [],
    products: [],
  });
  const [isComplete, setIsComplete] = useState(false);

  const totalSteps = 5;

  const updateData = (data: Partial<RegistrationData>) => {
    setRegistrationData(prev => ({ ...prev, ...data }));
  };

  const goToNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeRegistration = () => {
    setIsComplete(true);
  };

  if (isComplete) {
    return <WelcomeScreen data={registrationData as RegistrationData} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">Kazimas</span>
            </div>
            <Button variant="ghost" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />

          <Card className="p-8 mt-8">
            {currentStep === 1 && (
              <AccountCreationStep
                data={registrationData}
                onNext={(data) => {
                  updateData(data);
                  goToNextStep();
                }}
              />
            )}

            {currentStep === 2 && (
              <BusinessSetupStep
                data={registrationData}
                onNext={(data) => {
                  updateData(data);
                  goToNextStep();
                }}
                onBack={goToPreviousStep}
              />
            )}

            {currentStep === 3 && (
              <BrandingCustomizationStep
                data={registrationData}
                onNext={(data) => {
                  updateData(data);
                  goToNextStep();
                }}
                onBack={goToPreviousStep}
              />
            )}

            {currentStep === 4 && (
              <LocationSetupStep
                data={registrationData}
                onNext={(data) => {
                  updateData(data);
                  goToNextStep();
                }}
                onBack={goToPreviousStep}
              />
            )}

            {currentStep === 5 && (
              <QuickStartStep
                data={registrationData}
                onComplete={(data) => {
                  updateData(data);
                  completeRegistration();
                }}
                onBack={goToPreviousStep}
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
