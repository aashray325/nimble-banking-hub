
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

// Define types
export type Transaction = {
  id: string;
  trans_id: number;
  fromID: number | null;
  toID: number | null;
  fromAccount?: string;
  toAccount?: string;
  amount: number;
  type: string;
  timestamp: Date;
};

export type Loan = {
  id: string;
  loan_id: number;
  cust_id: number;
  amount: number;
  branch_id: number;
  remainingAmount: number;
  monthlyPayment: number;
  interestRate: number;
  term: number;
  createdAt: Date;
  paid: boolean;
  userId?: string;
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
  const [accountId, setAccountId] = useState<number | null>(null);

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
      
      if (data) {
        // Convert the database results to our Transaction type
        const formattedTransactions: Transaction[] = data.map(t => ({
          id: t.trans_id.toString(),
          trans_id: t.trans_id,
          fromID: t.fromID,
          toID: t.toID,
          fromAccount: t.fromID?.toString(),
          toAccount: t.toID?.toString(),
          amount: t.amount,
          type: t.type,
          timestamp: new Date()
        }));
        
        setTransactions(formattedTransactions);
      }
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
        
        if (data) {
          // Convert the database results to our Loan type
          const formattedLoans: Loan[] = data.map(loan => {
            // Calculate remaining amount (simplified)
            const remainingAmount = loan.amount * 0.8; // Example calculation
            
            // Calculate monthly payment
            const interestRate = 5 + (loan.amount > 10000 ? 2 : 0);
            const term = 24; // Default term
            const monthlyPayment = (loan.amount * (interestRate / 100 / 12)) / (1 - Math.pow(1 + (interestRate / 100 / 12), -term));
            
            return {
              id: loan.loan_id.toString(),
              loan_id: loan.loan_id,
              cust_id: loan.cust_id,
              amount: loan.amount,
              branch_id: loan.branch_id || 0,
              remainingAmount: remainingAmount,
              monthlyPayment: monthlyPayment,
              interestRate: interestRate,
              term: term,
              createdAt: new Date(),
              paid: remainingAmount <= 0,
              userId: user.id
            };
          });
          
          setLoans(formattedLoans);
        }
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
      const { data, error: transError } = await supabase
        .from('transactions')
        .insert({
          fromID: accountId,
          toID: parseInt(toAccount),
          amount,
          type: description || 'Transfer'
        })
        .select();

      if (transError) throw transError;

      // Update balances
      const { error: fromError } = await supabase.rpc(
        'update_balance',
        { 
          p_account_id: accountId,
          p_amount: -amount 
        }
      );

      if (fromError) throw fromError;

      const { error: toError } = await supabase.rpc(
        'update_balance',
        { 
          p_account_id: parseInt(toAccount),
          p_amount: amount 
        }
      );

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
    const interestRate = 5 + (amount > 10000 ? 2 : 0) + (term > 24 ? 1 : 0);

    // Calculate monthly payment
    const monthlyInterest = interestRate / 100 / 12;
    const monthlyPayment =
      (amount * monthlyInterest * Math.pow(1 + monthlyInterest, term)) /
      (Math.pow(1 + monthlyInterest, term) - 1);

    try {
      // Get customer ID
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('uid', user.id)
        .single();

      if (customerError) throw customerError;
      
      if (!customerData) {
        throw new Error('Customer record not found');
      }

      // Create loan
      const { data: loanData, error: loanError } = await supabase
        .from('loans')
        .insert({
          cust_id: customerData.id,
          amount,
          branch_id: 1 // Default branch ID
        })
        .select()
        .single();

      if (loanError) throw loanError;
      
      if (!loanData) {
        throw new Error('Failed to create loan');
      }

      // Add loan amount to user's balance
      if (accountId) {
        const { error: balanceError } = await supabase.rpc(
          'update_balance',
          { 
            p_account_id: accountId,
            p_amount: amount 
          }
        );

        if (balanceError) throw balanceError;
      }

      // Create a new loan in our local state
      const newLoan: Loan = {
        id: loanData.loan_id.toString(),
        loan_id: loanData.loan_id,
        cust_id: loanData.cust_id,
        amount: loanData.amount,
        branch_id: loanData.branch_id || 0,
        remainingAmount: loanData.amount,
        monthlyPayment,
        interestRate,
        term,
        createdAt: new Date(),
        paid: false,
        userId: user.id
      };

      // Update local state
      setLoans(prev => [newLoan, ...prev]);
      
      // Refresh transactions
      await fetchTransactions();
      
      toast.success('Loan approved and disbursed');
    } catch (error) {
      console.error('Loan application error:', error);
      toast.error('Failed to process loan application');
      throw error;
    }
  };

  // Make a loan payment
  const makeLoanPayment = async (loanId: string, amount: number) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Find the loan
    const loanIndex = loans.findIndex((loan) => loan.id === loanId);
    if (loanIndex === -1) {
      throw new Error('Loan not found');
    }

    const loan = loans[loanIndex];

    // Validate amount
    if (amount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    if (amount > loan.remainingAmount) {
      throw new Error('Payment amount exceeds remaining loan balance');
    }

    // Check if user has enough balance
    if (user.balance < amount) {
      throw new Error('Insufficient balance');
    }

    try {
      // Create payment transaction
      if (accountId) {
        const { error: transError } = await supabase
          .from('transactions')
          .insert({
            fromID: accountId,
            toID: null, // Bank
            amount,
            type: 'loan-payment'
          });
  
        if (transError) throw transError;
  
        // Update user balance
        const { error: balanceError } = await supabase.rpc(
          'update_balance',
          { 
            p_account_id: accountId,
            p_amount: -amount 
          }
        );
  
        if (balanceError) throw balanceError;
  
        // Update loan (In a real app, you'd update the loan in the database)
        // Since we don't have a remaining_amount column, we're just handling it in the frontend
        const updatedLoan = {
          ...loan,
          remainingAmount: loan.remainingAmount - amount,
          paid: loan.remainingAmount - amount <= 0
        };
  
        const updatedLoans = [...loans];
        updatedLoans[loanIndex] = updatedLoan;
        setLoans(updatedLoans);
        
        // Refresh transactions
        await fetchTransactions();
        
        toast.success('Loan payment completed successfully');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to process payment');
      throw error;
    }
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
    return loans.find((loan) => loan.id === loanId);
  };

  // Check if user has active loans
  const hasActiveLoans = loans.some((loan) => !loan.paid && loan.userId === user?.id);

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
