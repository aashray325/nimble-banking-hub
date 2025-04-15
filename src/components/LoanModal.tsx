
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBanking } from '@/contexts/BankingContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';
import { ArrowRight, Calculator, Check, Landmark } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { Slider } from '@/components/ui/slider';

interface LoanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoanModal = ({ isOpen, onClose }: LoanModalProps) => {
  const { user } = useAuth();
  const { applyForLoan, hasActiveLoans } = useBanking();
  const [amount, setAmount] = useState(5000);
  const [term, setTerm] = useState(12);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCalculation, setShowCalculation] = useState(false);

  // Calculate interest rate based on loan amount and term
  const calculateInterestRate = () => {
    return 5 + (amount > 10000 ? 2 : 0) + (term > 24 ? 1 : 0);
  };

  // Calculate monthly payment
  const calculateMonthlyPayment = () => {
    const interestRate = calculateInterestRate();
    const monthlyInterest = interestRate / 100 / 12;
    const payment =
      (amount * monthlyInterest * Math.pow(1 + monthlyInterest, term)) /
      (Math.pow(1 + monthlyInterest, term) - 1);
    return payment;
  };

  const resetForm = () => {
    setAmount(5000);
    setTerm(12);
    setIsSubmitting(false);
    setShowCalculation(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAmountChange = (value: number) => {
    setAmount(value);
  };

  const handleTermChange = (value: string) => {
    setTerm(parseInt(value));
  };

  const calculateLoan = () => {
    setShowCalculation(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !term) {
      toast.error('Please specify both loan amount and term');
      return;
    }

    if (amount < 1000) {
      toast.error('Minimum loan amount is $1,000');
      return;
    }

    if (amount > 50000) {
      toast.error('Maximum loan amount is $50,000');
      return;
    }

    setIsSubmitting(true);
    try {
      await applyForLoan(amount, term);
      handleClose();
      toast.success('Loan approved and disbursed to your account');
    } catch (error) {
      console.error('Loan application failed:', error);
      toast.error(error instanceof Error ? error.message : 'Loan application failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pre-defined term options
  const termOptions = [
    { value: 3, label: '3 months' },
    { value: 6, label: '6 months' },
    { value: 12, label: '1 year' },
    { value: 24, label: '2 years' },
    { value: 36, label: '3 years' },
    { value: 48, label: '4 years' },
    { value: 60, label: '5 years' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply for a Loan</DialogTitle>
          <DialogDescription>
            Get instant approval and funds directly to your account
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {hasActiveLoans && (
              <div className="rounded-md bg-amber-50 p-3 text-amber-800">
                <p className="flex items-center text-sm font-medium">
                  <Landmark className="mr-2 h-4 w-4" />
                  You already have active loans. New loans will affect your credit limit.
                </p>
              </div>
            )}

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="amount">Loan Amount: {formatCurrency(amount)}</Label>
              </div>
              <Slider
                id="amount"
                min={1000}
                max={50000}
                step={1000}
                defaultValue={[amount]}
                onValueChange={(values) => handleAmountChange(values[0])}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>$1,000</span>
                <span>$50,000</span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="term">Loan Term</Label>
              <Select 
                defaultValue={term.toString()} 
                onValueChange={handleTermChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select term length" />
                </SelectTrigger>
                <SelectContent>
                  {termOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!showCalculation ? (
              <Button
                type="button"
                variant="outline"
                className="mt-2"
                onClick={calculateLoan}
              >
                <Calculator className="mr-2 h-4 w-4" />
                Calculate Payment
              </Button>
            ) : (
              <div className="rounded-md bg-muted p-4">
                <h4 className="mb-2 font-medium">Loan Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Loan Amount:</span>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Interest Rate:</span>
                    <span className="font-medium">{calculateInterestRate()}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Term Length:</span>
                    <span className="font-medium">{term} months</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span>Monthly Payment:</span>
                    <span className="font-bold">{formatCurrency(calculateMonthlyPayment())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Repayment:</span>
                    <span className="font-medium">{formatCurrency(calculateMonthlyPayment() * term)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button 
              type="submit" 
              disabled={isSubmitting || !showCalculation}
            >
              {isSubmitting ? 'Processing...' : 'Apply for Loan'} 
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LoanModal;
