import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBanking, Transaction } from '@/contexts/BankingContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/sonner';
import { ArrowRight, ArrowUp, BanknoteIcon, CreditCard, Landmark, LogOut, Plus, RefreshCcw } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TransferModal from '@/components/TransferModal';
import LoanModal from '@/components/LoanModal';

const Dashboard = () => {
  const { user, isLoggedIn, isLoading, logout } = useAuth();
  const { getAccountTransactions, hasActiveLoans } = useBanking();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      setTransactions(getAccountTransactions());
    }
  }, [user, getAccountTransactions]);

  useEffect(() => {
    const handleUserUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail) {
        setTransactions(getAccountTransactions());
      }
    };

    window.addEventListener('userUpdated', handleUserUpdate);
    return () => {
      window.removeEventListener('userUpdated', handleUserUpdate);
    };
  }, [getAccountTransactions]);

  const refreshData = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setTransactions(getAccountTransactions());
      setIsRefreshing(false);
      toast.success('Data refreshed');
    }, 800);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <CreditCard className="mx-auto h-12 w-12 animate-pulse text-banking-primary" />
          <p>Loading your account...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" />;
  }

  const renderTransactionItem = (transaction: Transaction) => {
    const isIncoming = transaction.toAccount === user?.accountNumber;
    const isOutgoing = transaction.fromAccount === user?.accountNumber;
    const otherParty = isIncoming ? transaction.fromAccount : transaction.toAccount;
    
    let title = '';
    if (transaction.type === 'loan') {
      title = 'Loan Disbursement';
    } else if (transaction.type === 'loan-payment') {
      title = 'Loan Payment';
    } else if (otherParty === 'BANK') {
      title = isIncoming ? 'Deposit' : 'Withdrawal';
    } else {
      title = isIncoming ? 'Received from' : 'Sent to';
      title += ` ${otherParty}`;
    }

    return (
      <div key={transaction.id} className="transaction-item">
        <div className="flex items-center space-x-3">
          <div className={`rounded-full p-2 ${isIncoming ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
            {isIncoming ? <ArrowUp className="h-5 w-5 rotate-180" /> : <ArrowUp className="h-5 w-5" />}
          </div>
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-sm text-gray-500">{formatDate(transaction.timestamp)}</p>
          </div>
        </div>
        <div className={`font-semibold ${isIncoming ? 'text-green-600' : 'text-red-500'}`}>
          {isIncoming ? '+' : '-'}{formatCurrency(transaction.amount)}
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6 flex flex-col items-start justify-between space-y-4 md:flex-row md:items-center md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold">Welcome, {user?.firstName}!</h1>
            <p className="text-gray-500">Manage your finances with ease</p>
          </div>
          <div className="flex space-x-4">
            <Button variant="outline" size="sm" onClick={refreshData} disabled={isRefreshing}>
              <RefreshCcw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Account Balance</CardTitle>
              <CardDescription>Available funds</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col">
                <div className="mb-1 text-sm text-gray-500">Account Number: {user?.accountNumber}</div>
                <div className="balance-text">{formatCurrency(user?.balance || 0)}</div>
                <div className="mt-4 flex space-x-3">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => setIsTransferModalOpen(true)}
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Transfer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setIsLoanModalOpen(true)}
                  >
                    <Landmark className="mr-2 h-4 w-4" />
                    Loans
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Transaction History</CardTitle>
              <CardDescription>Your recent account activity</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all">
                <TabsList className="mb-4 grid w-full grid-cols-3">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="incoming">Incoming</TabsTrigger>
                  <TabsTrigger value="outgoing">Outgoing</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="max-h-[400px] overflow-auto">
                  {transactions.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      <BanknoteIcon className="mx-auto mb-2 h-10 w-10 opacity-20" />
                      <p>No transactions yet</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {transactions.map(renderTransactionItem)}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="incoming" className="max-h-[400px] overflow-auto">
                  {transactions.filter(t => t.toAccount === user?.accountNumber).length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      <BanknoteIcon className="mx-auto mb-2 h-10 w-10 opacity-20" />
                      <p>No incoming transactions</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {transactions
                        .filter(t => t.toAccount === user?.accountNumber)
                        .map(renderTransactionItem)}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="outgoing" className="max-h-[400px] overflow-auto">
                  {transactions.filter(t => t.fromAccount === user?.accountNumber).length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      <BanknoteIcon className="mx-auto mb-2 h-10 w-10 opacity-20" />
                      <p>No outgoing transactions</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {transactions
                        .filter(t => t.fromAccount === user?.accountNumber)
                        .map(renderTransactionItem)}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <h2 className="mb-4 text-2xl font-bold">Loan Status</h2>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Your Loans</CardTitle>
              <CardDescription>Manage your active loans and apply for new ones</CardDescription>
            </CardHeader>
            <CardContent>
              {hasActiveLoans ? (
                <div className="mb-4 rounded-lg bg-amber-50 p-4">
                  <div className="flex items-center">
                    <Landmark className="mr-3 h-6 w-6 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-800">You have active loans</p>
                      <p className="text-sm text-amber-700">View details in the Loans section</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-4 rounded-lg bg-blue-50 p-4">
                  <div className="flex items-center">
                    <Landmark className="mr-3 h-6 w-6 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-800">No active loans</p>
                      <p className="text-sm text-blue-700">Apply for a loan to get quick funding</p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={() => setIsLoanModalOpen(true)}
                className="mt-2 w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Apply for a Loan
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <TransferModal 
        isOpen={isTransferModalOpen} 
        onClose={() => setIsTransferModalOpen(false)} 
      />

      <LoanModal 
        isOpen={isLoanModalOpen} 
        onClose={() => setIsLoanModalOpen(false)} 
      />
    </AppLayout>
  );
};

export default Dashboard;
