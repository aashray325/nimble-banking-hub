
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { toast } from '@/components/ui/sonner';

// Define types
export type Transaction = {
  id: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  description: string;
  timestamp: string;
  type: 'transfer' | 'deposit' | 'withdrawal' | 'loan' | 'loan-payment';
};

export type Loan = {
  id: string;
  userId: string;
  amount: number;
  interestRate: number;
  term: number; // In months
  monthlyPayment: number;
  approved: boolean;
  paid: boolean;
  remainingAmount: number;
  createdAt: string;
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

// Create context
const BankingContext = createContext<BankingContextType | undefined>(undefined);

// Dummy data for demo
const dummyAccounts: Record<string, { balance: number }> = {
  '1234567890': { balance: 5000 },
  '0987654321': { balance: 3000 },
};

const dummyTransactions: Transaction[] = [
  {
    id: '1',
    fromAccount: '1234567890',
    toAccount: '0987654321',
    amount: 100,
    description: 'Dinner payment',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    type: 'transfer',
  },
  {
    id: '2',
    fromAccount: 'BANK',
    toAccount: '1234567890',
    amount: 2000,
    description: 'Salary',
    timestamp: new Date(Date.now() - 86400000 * 7).toISOString(),
    type: 'deposit',
  },
];

const dummyLoans: Loan[] = [];

// Provider component
export const BankingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>(dummyTransactions);
  const [loans, setLoans] = useState<Loan[]>(dummyLoans);

  // Load data from localStorage on component mount
  useEffect(() => {
    if (user) {
      const storedTransactions = localStorage.getItem('bankingTransactions');
      if (storedTransactions) {
        setTransactions(JSON.parse(storedTransactions));
      }

      const storedLoans = localStorage.getItem('bankingLoans');
      if (storedLoans) {
        setLoans(JSON.parse(storedLoans));
      }
    }
  }, [user]);

  // Save data to localStorage when it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('bankingTransactions', JSON.stringify(transactions));
      localStorage.setItem('bankingLoans', JSON.stringify(loans));
    }
  }, [transactions, loans, user]);

  // Transfer money to another account
  const transfer = async (toAccount: string, amount: number, description: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Validate amount
    if (amount <= 0) {
      throw new Error('Amount must be greater than zero');
    }

    // Check if user has enough balance
    if (user.balance < amount) {
      throw new Error('Insufficient balance');
    }

    // Check if destination account exists (simplified)
    if (toAccount !== user.accountNumber && !dummyAccounts[toAccount]) {
      throw new Error('Destination account not found');
    }

    // Create transaction
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      fromAccount: user.accountNumber,
      toAccount,
      amount,
      description,
      timestamp: new Date().toISOString(),
      type: 'transfer',
    };

    // Update balances
    // In a real app, this would be an atomic operation in the backend
    if (toAccount !== user.accountNumber) {
      // Update user balance
      const updatedUser = {
        ...user,
        balance: user.balance - amount,
      };
      localStorage.setItem('bankingUser', JSON.stringify(updatedUser));

      // Update cached user balance
      const userEvent = new CustomEvent('userUpdated', { detail: updatedUser });
      window.dispatchEvent(userEvent);
    }

    // Update transactions
    setTransactions((prev) => [newTransaction, ...prev]);
    toast.success('Transfer completed successfully');
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
      id: Date.now().toString(),
      userId: user.id,
      amount,
      interestRate,
      term,
      monthlyPayment,
      approved: true, // Auto-approved for demo
      paid: false,
      remainingAmount: amount,
      createdAt: new Date().toISOString(),
    };

    // Create loan disbursement transaction
    const loanTransaction: Transaction = {
      id: Date.now().toString() + '-loan',
      fromAccount: 'BANK',
      toAccount: user.accountNumber,
      amount,
      description: 'Loan disbursement',
      timestamp: new Date().toISOString(),
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

    // Create payment transaction
    const paymentTransaction: Transaction = {
      id: Date.now().toString(),
      fromAccount: user.accountNumber,
      toAccount: 'BANK',
      amount,
      description: `Loan payment - Loan #${loanId}`,
      timestamp: new Date().toISOString(),
      type: 'loan-payment',
    };

    // Update loan
    const updatedLoan = {
      ...loan,
      remainingAmount: loan.remainingAmount - amount,
      paid: loan.remainingAmount - amount <= 0,
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
    if (!user) return [];
    return transactions.filter(
      (t) => t.fromAccount === user.accountNumber || t.toAccount === user.accountNumber
    );
  };

  // Get a loan by ID
  const getLoanById = (loanId: string) => {
    return loans.find((loan) => loan.id === loanId);
  };

  // Check if user has active loans
  const hasActiveLoans = loans.some((loan) => loan.userId === user?.id && !loan.paid);

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
