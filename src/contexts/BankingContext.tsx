import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

// Define types
export type Transaction = {
  trans_id: string;
  fromID: string | null;
  toID: string | null;
  amount: number;
  type: string;
};

export type Loan = {
  loan_id: string;
  cust_id: string;
  amount: number;
  branch_id: number;
};

type BankingContextType = {
  transactions: Transaction[];
  loans: Loan[];
  transfer: (toAccount: string, amount: number, description: string) => Promise<void>;
  applyForLoan: (amount: number, term: number) => Promise<void>;
  makeLoanPayment: (loanId: string, amount: number) => Promise<void>;
  getAccountTransactions: () => Transaction[];
  getLoanById: (loanId: string) => Loan | undefined;
  hasActiveLoans: boolean;
};

const BankingContext = createContext<BankingContextType | undefined>(undefined);

export const BankingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);

  // Fetch account and transaction data
  useEffect(() => {
    if (user) {
      fetchAccountData();
      fetchTransactions();
      fetchLoans();
    }
  }, [user]);

  const fetchAccountData = async () => {
    if (!user) return;

    try {
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('uid', user.id)
        .single();

      if (customerError) throw customerError;

      if (customerData) {
        const { data: accountData, error: accountError } = await supabase
          .from('account')
          .select('account_id')
          .eq('customer_id', customerData.id)
          .single();

        if (accountError) throw accountError;
        if (accountData) {
          setAccountId(accountData.account_id);
        }
      }
    } catch (error) {
      console.error('Error fetching account:', error);
      toast.error('Failed to fetch account data');
    }
  };

  const fetchTransactions = async () => {
    if (!accountId) return;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .or(`fromID.eq.${accountId},toID.eq.${accountId}`);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to fetch transactions');
    }
  };

  const fetchLoans = async () => {
    if (!user) return;

    try {
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('uid', user.id)
        .single();

      if (customerError) throw customerError;

      if (customerData) {
        const { data, error } = await supabase
          .from('loans')
          .select('*')
          .eq('cust_id', customerData.id);

        if (error) throw error;
        setLoans(data || []);
      }
    } catch (error) {
      console.error('Error fetching loans:', error);
      toast.error('Failed to fetch loans');
    }
  };

  const transfer = async (toAccount: string, amount: number, description: string) => {
    if (!accountId) {
      throw new Error('No account found');
    }

    try {
      // First, insert the transaction
      const { error: transError } = await supabase
        .from('transactions')
        .insert([
          {
            fromID: accountId,
            toID: toAccount,
            amount,
            type: 'Transfer',
          },
        ]);

      if (transError) throw transError;

      // Update balances
      const { error: fromError } = await supabase
        .from('account')
        .update({ balance: supabase.sql`balance - ${amount}` })
        .eq('account_id', accountId);

      if (fromError) throw fromError;

      const { error: toError } = await supabase
        .from('account')
        .update({ balance: supabase.sql`balance + ${amount}` })
        .eq('account_id', toAccount);

      if (toError) throw toError;

      // Refresh transactions
      await fetchTransactions();
      toast.success('Transfer completed successfully');
    } catch (error) {
      console.error('Transfer error:', error);
      toast.error('Failed to complete transfer');
      throw error;
    }
  };

  // Apply for a loan
  const applyForLoan = async (amount: number, term: number) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Validate amount and term
    if (amount <= 0) {
      throw new Error('Loan amount must be greater than zero');
    }

    if (term < 3 || term > 60) {
      throw new Error('Loan term must be between 3 and 60 months');
    }

    // Calculate interest rate based on loan amount and term
    // This is simplified; in a real app, this would be more complex
    const interestRate = 5 + (amount > 10000 ? 2 : 0) + (term > 24 ? 1 : 0);

    // Calculate monthly payment
    // Using simplified formula: P = L[i(1+i)^n]/[(1+i)^n-1]
    const monthlyInterest = interestRate / 100 / 12;
    const monthlyPayment =
      (amount * monthlyInterest * Math.pow(1 + monthlyInterest, term)) /
      (Math.pow(1 + monthlyInterest, term) - 1);

    // Create loan
    const newLoan: Loan = {
      loan_id: Date.now().toString(),
      cust_id: user.id,
      amount,
      branch_id: 1, // Default branch ID
    };

    // Create loan disbursement transaction
    const loanTransaction: Transaction = {
      trans_id: Date.now().toString() + '-loan',
      fromID: 'BANK',
      toID: accountId,
      amount,
      type: 'loan',
    };

    // Update user balance
    const updatedUser = {
      ...user,
      balance: user.balance + amount,
    };
    localStorage.setItem('bankingUser', JSON.stringify(updatedUser));

    // Update cached user balance
    const userEvent = new CustomEvent('userUpdated', { detail: updatedUser });
    window.dispatchEvent(userEvent);

    // Update loans and transactions
    setLoans((prev) => [newLoan, ...prev]);
    setTransactions((prev) => [loanTransaction, ...prev]);
    toast.success('Loan approved and disbursed');
  };

  // Make a loan payment
  const makeLoanPayment = async (loanId: string, amount: number) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Find the loan
    const loanIndex = loans.findIndex((loan) => loan.loan_id === loanId);
    if (loanIndex === -1) {
      throw new Error('Loan not found');
    }

    const loan = loans[loanIndex];

    // Validate amount
    if (amount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    if (amount > loan.amount) {
      throw new Error('Payment amount exceeds remaining loan balance');
    }

    // Check if user has enough balance
    if (user.balance < amount) {
      throw new Error('Insufficient balance');
    }

    // Create payment transaction
    const paymentTransaction: Transaction = {
      trans_id: Date.now().toString(),
      fromID: accountId,
      toID: 'BANK',
      amount,
      type: 'loan-payment',
    };

    // Update loan
    const updatedLoan = {
      ...loan,
      amount: loan.amount - amount,
    };

    const updatedLoans = [...loans];
    updatedLoans[loanIndex] = updatedLoan;

    // Update user balance
    const updatedUser = {
      ...user,
      balance: user.balance - amount,
    };
    localStorage.setItem('bankingUser', JSON.stringify(updatedUser));

    // Update cached user balance
    const userEvent = new CustomEvent('userUpdated', { detail: updatedUser });
    window.dispatchEvent(userEvent);

    // Update loans and transactions
    setLoans(updatedLoans);
    setTransactions((prev) => [paymentTransaction, ...prev]);
    toast.success('Loan payment completed successfully');
  };

  // Get transactions for the current user
  const getAccountTransactions = () => {
    if (!accountId) return [];
    return transactions.filter(
      (t) => t.fromID === accountId || t.toID === accountId
    );
  };

  // Get a loan by ID
  const getLoanById = (loanId: string) => {
    return loans.find((loan) => loan.loan_id === loanId);
  };

  // Check if user has active loans
  const hasActiveLoans = loans.some((loan) => loan.cust_id === user?.id);

  const value = {
    transactions,
    loans,
    transfer,
    applyForLoan,
    makeLoanPayment,
    getAccountTransactions,
    getLoanById,
    hasActiveLoans,
  };

  return <BankingContext.Provider value={value}>{children}</BankingContext.Provider>;
};

// Custom hook to use the banking context
export const useBanking = () => {
  const context = useContext(BankingContext);
  if (context === undefined) {
    throw new Error('useBanking must be used within a BankingProvider');
  }
  return context;
};
