
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBanking, Loan } from '@/contexts/BankingContext';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';
import { Check, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { Slider } from '@/components/ui/slider';

interface LoanPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan;
}

const LoanPaymentModal = ({ isOpen, onClose, loan }: LoanPaymentModalProps) => {
  const { user } = useAuth();
  const { makeLoanPayment } = useBanking();
  const [amount, setAmount] = useState(loan.monthlyPayment);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ensure amount doesn't exceed remaining loan balance or user balance
  const maxAmount = Math.min(loan.remainingAmount, user?.balance || 0);

  const resetForm = () => {
    setAmount(loan.monthlyPayment);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAmountChange = (value: number[]) => {
    setAmount(value[0]);
  };

  const handleFullPayment = () => {
    setAmount(loan.remainingAmount);
  };

  const handleMonthlyPayment = () => {
    setAmount(loan.monthlyPayment);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount) {
      toast.error('Please specify payment amount');
      return;
    }

    if (amount <= 0) {
      toast.error('Payment amount must be greater than zero');
      return;
    }

    if (amount > (user?.balance || 0)) {
      toast.error('Insufficient balance');
      return;
    }

    if (amount > loan.remainingAmount) {
      toast.error('Payment exceeds remaining loan balance');
      return;
    }

    setIsSubmitting(true);
    try {
      await makeLoanPayment(loan.id, amount);
      handleClose();
      
      if (amount >= loan.remainingAmount) {
        toast.success('Loan fully paid off!');
      } else {
        toast.success('Payment processed successfully');
      }
    } catch (error) {
      console.error('Payment failed:', error);
      toast.error(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Make a Loan Payment</DialogTitle>
          <DialogDescription>
            Loan #{loan.id.substring(0, 8)} - Remaining: {formatCurrency(loan.remainingAmount)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="rounded-md bg-blue-50 p-3">
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-blue-100 p-1">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-800">Available Balance</p>
                  <p className="text-sm text-blue-700">{formatCurrency(user?.balance || 0)}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="amount">Payment Amount: {formatCurrency(amount)}</Label>
              </div>

              <Slider
                id="amount"
                min={1}
                max={maxAmount}
                step={1}
                value={[amount]}
                onValueChange={handleAmountChange}
                disabled={isSubmitting}
              />
              
              <div className="flex justify-between text-xs text-gray-500">
                <span>$1</span>
                <span>{formatCurrency(maxAmount)}</span>
              </div>
            </div>

            <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleMonthlyPayment}
                disabled={isSubmitting || loan.monthlyPayment > maxAmount}
              >
                Monthly Payment ({formatCurrency(loan.monthlyPayment)})
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleFullPayment}
                disabled={isSubmitting || loan.remainingAmount > maxAmount}
              >
                Pay In Full
              </Button>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button 
              type="submit" 
              disabled={isSubmitting || amount <= 0 || amount > maxAmount}
            >
              {isSubmitting ? 'Processing...' : 'Make Payment'} 
              <Check className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LoanPaymentModal;
