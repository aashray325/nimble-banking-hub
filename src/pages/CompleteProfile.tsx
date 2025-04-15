import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';
import { ArrowRight, CreditCard, DollarSign, User } from 'lucide-react';

const CompleteProfile = () => {
  const { completeProfile, isLoggedIn, isLoading } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [initialBalance, setInitialBalance] = useState('1000');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if we have temp user data
  const hasTempUser = !!localStorage.getItem('tempUser');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !initialBalance) {
      toast.error('Please fill in all fields');
      return;
    }

    const balanceValue = parseFloat(initialBalance);
    if (isNaN(balanceValue) || balanceValue < 100) {
      toast.error('Initial balance must be at least $100');
      return;
    }

    setIsSubmitting(true);
    try {
      await completeProfile({
        firstName,
        lastName,
        email: '', // Will be taken from temp storage
        initialBalance: balanceValue,
      });
    } catch (error) {
      console.error('Profile completion failed:', error);
      toast.error(error instanceof Error ? error.message : 'Profile completion failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If already logged in, redirect to dashboard
  if (isLoggedIn) {
    return <Navigate to="/dashboard" />;
  }

  // If no temp user (not coming from signup), redirect to signup
  if (!hasTempUser && !isLoading) {
    return <Navigate to="/signup" />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-banking-background p-4">
      <div className="mb-8 text-center">
        <div className="mb-4 flex items-center justify-center gap-2">
          <CreditCard className="h-8 w-8 text-banking-primary" />
          <h1 className="text-3xl font-bold text-banking-primary">NimbleBank</h1>
        </div>
        <p className="text-banking-text-light">Almost there! Let's complete your profile</p>
      </div>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Complete Your Profile</CardTitle>
          <CardDescription className="text-center">
            We need a few more details to set up your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <Input
                      id="firstName"
                      placeholder="John"
                      className="pl-10"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      className="pl-10"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="initialBalance">Initial Deposit ($)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <Input
                    id="initialBalance"
                    type="number"
                    placeholder="1000"
                    className="pl-10"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    min="100"
                    step="100"
                    required
                  />
                </div>
                <p className="text-xs text-banking-text-light">Minimum initial deposit: $100</p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || isLoading}
              >
                {isSubmitting ? 'Creating account...' : 'Complete Setup'} 
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteProfile;
