
import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// Extended user type with additional properties
export type User = SupabaseUser & {
  firstName: string;
  lastName: string;
  balance: number;
  accountNumber: string;
};

type AuthContextType = {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  completeProfile: (profileData: {
    firstName: string;
    lastName: string;
    email: string;
    initialBalance: number;
  }) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Function to fetch user profile data
  const fetchUserProfile = async (userId: string) => {
    try {
      // Get customer data by uid
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('uid', userId)
        .single();

      if (customerError) throw customerError;

      if (customerData) {
        // Get account data
        const { data: accountData, error: accountError } = await supabase
          .from('account')
          .select('*')
          .eq('customer_id', customerData.id)
          .single();

        if (accountError) throw accountError;

        // Create extended user object with profile and account data
        if (accountData) {
          const extendedUser: User = {
            ...(supabase.auth.getUser().then(({ data }) => data.user) as unknown as SupabaseUser),
            firstName: customerData.first_name,
            lastName: customerData.last_name,
            balance: accountData.balance,
            accountNumber: accountData.account_id.toString(),
          };
          setUser(extendedUser);
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      toast.success('Successfully logged in');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to login');
      throw error;
    }
  };

  const signup = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      
      // Store temp email for profile completion
      localStorage.setItem('tempUser', JSON.stringify({ email }));
      
      // Navigate to complete profile
      navigate('/complete-profile');
      
      toast.success('Please complete your profile information');
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sign up');
      throw error;
    }
  };

  const completeProfile = async (profileData: {
    firstName: string;
    lastName: string;
    email: string;
    initialBalance: number;
  }) => {
    try {
      // Get temp user email from storage
      const tempUser = localStorage.getItem('tempUser');
      if (!tempUser) {
        throw new Error('No temporary user found');
      }
      
      const { email } = JSON.parse(tempUser);
      
      // Get user id from auth
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session?.user.id) {
        throw new Error('User not authenticated');
      }
      
      const userId = authData.session.user.id;
      
      // Insert customer record
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .insert([
          {
            first_name: profileData.firstName,
            last_name: profileData.lastName,
            uid: userId
          }
        ])
        .select()
        .single();
        
      if (customerError) throw customerError;
      
      // Create account for customer
      if (customerData) {
        const { error: accountError } = await supabase
          .from('account')
          .insert([
            {
              customer_id: customerData.id,
              balance: profileData.initialBalance,
              type: 'Checking',
              status: 'Active'
            }
          ]);
          
        if (accountError) throw accountError;
      }
      
      // Clean up temp storage
      localStorage.removeItem('tempUser');
      
      // Fetch complete user profile
      await fetchUserProfile(userId);
      
      toast.success('Profile completed successfully');
      navigate('/dashboard');
    } catch (error) {
      console.error('Profile completion error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to complete profile');
      throw error;
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      navigate('/login');
      toast.success('Successfully logged out');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to logout');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isLoading,
        login,
        signup,
        logout,
        completeProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
