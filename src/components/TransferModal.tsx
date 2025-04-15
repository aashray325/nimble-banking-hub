
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TransferModal = ({ isOpen, onClose }: TransferModalProps) => {
  const { user } = useAuth();
  const { transfer } = useBanking();
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountError, setAccountError] = useState('');

  const resetForm = () => {
    setAccountNumber('');
    setAmount('');
    setDescription('');
    setIsSubmitting(false);
    setAccountError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateAccountNumber = (value: string) => {
    const accountNum = parseInt(value);
    if (isNaN(accountNum) || value !== accountNum.toString()) {
      setAccountError('Please enter a valid account number');
      return false;
    }
    
    if (value === user?.accountNumber) {
      setAccountError('You cannot transfer to your own account');
      return false;
    }
    
    setAccountError('');
    return true;
  };

  const handleAccountNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAccountNumber(value);
    if (value) {
      validateAccountNumber(value);
    } else {
      setAccountError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset any previous errors
    setAccountError('');
    
    if (!accountNumber || !amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!validateAccountNumber(accountNumber)) {
      return;
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (transferAmount > (user?.balance || 0)) {
      toast.error('Insufficient balance');
      return;
    }

    setIsSubmitting(true);
    try {
      await transfer(accountNumber, transferAmount, description || 'Transfer');
      handleClose();
      toast.success('Transfer completed successfully');
    } catch (error) {
      console.error('Transfer failed:', error);
      if (error instanceof Error) {
        if (error.message.includes('Destination account not found')) {
          setAccountError('Account not found');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error('Transfer failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer Money</DialogTitle>
          <DialogDescription>
            Send money to another account instantly
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="accountNumber">
                Recipient Account Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="accountNumber"
                placeholder="Enter account number"
                value={accountNumber}
                onChange={handleAccountNumberChange}
                required
                className={accountError ? "border-red-500" : ""}
              />
              {accountError && (
                <p className="text-xs text-red-500 mt-1">{accountError}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="amount">
                Amount <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="0.01"
                step="0.01"
              />
              <p className="text-xs text-banking-text-light">
                Available balance: {formatCurrency(user?.balance || 0)}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">
                Description <span className="text-xs text-gray-500">(Optional)</span>
              </Label>
              <Textarea
                id="description"
                placeholder="What's this transfer for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : 'Transfer'} 
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TransferModal;
