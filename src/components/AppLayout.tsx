
import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { 
  CreditCard, 
  User, 
  LayoutDashboard, 
  BanknoteIcon, 
  Landmark, 
  LogOut, 
  Menu,
  X 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Loans', path: '/loans', icon: Landmark },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="flex min-h-screen flex-col bg-banking-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-banking-primary" />
            <span className="text-xl font-bold text-banking-primary">NimbleBank</span>
          </Link>

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={toggleMobileMenu}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>

          {/* Desktop Nav */}
          <nav className="hidden md:flex md:items-center md:space-x-4">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={location.pathname === item.path ? 'default' : 'ghost'}
                  className="flex items-center gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              </Link>
            ))}
          </nav>

          {/* User Menu (Desktop) */}
          <div className="hidden items-center md:flex">
            {user && (
              <div className="mr-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-banking-primary text-white">
                  {user.firstName.charAt(0)}
                  {user.lastName.charAt(0)}
                </div>
                <div className="hidden text-sm lg:block">
                  <p className="font-medium">{user.firstName} {user.lastName}</p>
                  <p className="text-gray-500">{formatCurrency(user.balance)}</p>
                </div>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-30 bg-white pt-16">
          <div className="container mx-auto px-4 py-4">
            {user && (
              <div className="mb-6 flex items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-banking-primary text-xl text-white">
                  {user.firstName.charAt(0)}
                  {user.lastName.charAt(0)}
                </div>
                <div className="ml-4">
                  <p className="font-medium">{user.firstName} {user.lastName}</p>
                  <p className="text-gray-500">{formatCurrency(user.balance)}</p>
                </div>
              </div>
            )}

            <nav className="flex flex-col space-y-2">
              {navItems.map((item) => (
                <Link 
                  key={item.path} 
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Button
                    variant={location.pathname === item.path ? 'default' : 'ghost'}
                    className="flex w-full items-center justify-start gap-3"
                    size="lg"
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              ))}
              <Separator className="my-4" />
              <Button 
                variant="outline" 
                className="flex w-full items-center justify-start gap-3"
                size="lg"
                onClick={logout}
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </Button>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t bg-white py-6">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} NimbleBank. All rights reserved.</p>
          <p className="mt-2">This is a demo application. Not for real banking use.</p>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;
