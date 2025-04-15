
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBanking, Loan } from '@/contexts/BankingContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/components/ui/sonner';
import { 
  AlertCircle, ArrowUp, BanknoteIcon, Check, CreditCard, Landmark, Plus, RefreshCcw 
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { formatCurrency, formatDate } from '@/lib/formatters';
import LoanModal from '@/components/LoanModal';
import LoanPaymentModal from '@/components/LoanPaymentModal';

const Loans = () => {
  const { user, isLoggedIn, isLoading } = useAuth();
  const { loans } = useBanking();
  const [userLoans, setUserLoans] = useState<Loan[]>([]);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      setUserLoans(loans.filter(loan => loan.userId === user.id));
    }
  }, [user, loans]);

  // Event listener for user updates
  useEffect(() => {
    const handleUserUpdate = () => {
      // Refresh loans when user data changes
      if (user) {
        setUserLoans(loans.filter(loan => loan.userId === user.id));
      }
    };

    window.addEventListener('userUpdated', handleUserUpdate);
    return () => {
      window.removeEventListener('userUpdated', handleUserUpdate);
    };
  }, [user, loans]);

  const refreshData = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      if (user) {
        setUserLoans(loans.filter(loan => loan.userId === user.id));
      }
      setIsRefreshing(false);
      toast.success('Data refreshed');
    }, 800);
  };

  const handlePayment = (loan: Loan) => {
    setSelectedLoan(loan);
    setIsPaymentModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <CreditCard className="mx-auto h-12 w-12 animate-pulse text-banking-primary" />
          <p>Loading your loans...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" />;
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6 flex flex-col items-start justify-between space-y-4 md:flex-row md:items-center md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold">Loan Management</h1>
            <p className="text-gray-500">View and manage your loans</p>
          </div>
          <div className="flex space-x-4">
            <Button variant="outline" size="sm" onClick={refreshData} disabled={isRefreshing}>
              <RefreshCcw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setIsLoanModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Apply for Loan
            </Button>
          </div>
        </div>

        {/* Loan Information */}
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Loan Information</CardTitle>
              <CardDescription>
                Our loans come with competitive interest rates and flexible repayment terms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="rounded-lg bg-blue-50 p-4">
                  <h3 className="mb-2 font-semibold text-blue-800">Personal Loans</h3>
                  <p className="text-sm text-blue-700">
                    Interest rates from 5-10% based on loan amount and term length
                  </p>
                </div>
                <div className="rounded-lg bg-purple-50 p-4">
                  <h3 className="mb-2 font-semibold text-purple-800">Flexible Terms</h3>
                  <p className="text-sm text-purple-700">
                    Repayment periods from 3 to 60 months with no early repayment penalties
                  </p>
                </div>
                <div className="rounded-lg bg-green-50 p-4">
                  <h3 className="mb-2 font-semibold text-green-800">Fast Approval</h3>
                  <p className="text-sm text-green-700">
                    Get instant approval and funds disbursed directly to your account
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Your Loans Section */}
        <h2 className="mb-4 text-2xl font-bold">Your Loans</h2>
        
        {userLoans.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <Landmark className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                <h3 className="text-xl font-medium">No Active Loans</h3>
                <p className="mb-6 text-gray-500">You don't have any loans at the moment</p>
                <Button onClick={() => setIsLoanModalOpen(true)}>Apply for a Loan</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {userLoans.map((loan) => (
              <Card key={loan.id} className={loan.paid ? 'border-green-200 bg-green-50' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Loan #{loan.id.substring(0, 8)}</CardTitle>
                    {loan.paid && (
                      <span className="flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                        <Check className="mr-1 h-3 w-3" /> Paid
                      </span>
                    )}
                  </div>
                  <CardDescription>
                    Issued on {formatDate(loan.createdAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="mb-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Loan Amount</p>
                      <p className="text-lg font-semibold">{formatCurrency(loan.amount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Remaining Balance</p>
                      <p className="text-lg font-semibold">{formatCurrency(loan.remainingAmount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Interest Rate</p>
                      <p className="font-semibold">{loan.interestRate}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Term Length</p>
                      <p className="font-semibold">{loan.term} months</p>
                    </div>
                  </div>
                  <div className="rounded-md bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">Monthly Payment</p>
                    <p className="text-lg font-semibold">{formatCurrency(loan.monthlyPayment)}</p>
                  </div>
                </CardContent>
                <CardFooter>
                  {!loan.paid && (
                    <Button 
                      className="w-full" 
                      onClick={() => handlePayment(loan)}
                    >
                      Make a Payment
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Loan Application Modal */}
      <LoanModal 
        isOpen={isLoanModalOpen} 
        onClose={() => setIsLoanModalOpen(false)} 
      />

      {/* Loan Payment Modal */}
      {selectedLoan && (
        <LoanPaymentModal 
          isOpen={isPaymentModalOpen} 
          onClose={() => setIsPaymentModalOpen(false)}
          loan={selectedLoan}
        />
      )}
    </AppLayout>
  );
};

export default Loans;
