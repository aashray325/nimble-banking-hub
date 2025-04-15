
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/sonner';

// Define types
type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  accountNumber: string;
  balance: number;
  createdAt: string;
};

type AuthContextType = {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<string>;
  logout: () => void;
  completeProfile: (userData: Omit<User, 'id' | 'accountNumber' | 'createdAt'> & { initialBalance: number }) => Promise<void>;
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Dummy user database for demo purposes
const userDatabase: Record<string, { password: string; user: User }> = {
  'user@example.com': {
    password: 'password123',
    user: {
      id: '1',
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      accountNumber: '1234567890',
      balance: 5000,
      createdAt: new Date().toISOString(),
    },
  },
};

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Check for saved user on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem('bankingUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const userRecord = userDatabase[email.toLowerCase()];
    
    if (!userRecord || userRecord.password !== password) {
      setIsLoading(false);
      throw new Error('Invalid email or password');
    }
    
    setUser(userRecord.user);
    localStorage.setItem('bankingUser', JSON.stringify(userRecord.user));
    setIsLoading(false);
    toast.success('Login successful');
    navigate('/dashboard');
  };

  // Signup function
  const signup = async (email: string, password: string) => {
    setIsLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (userDatabase[email.toLowerCase()]) {
      setIsLoading(false);
      throw new Error('Email already in use');
    }
    
    const userId = Date.now().toString();
    
    // We don't set the user yet, as they need to complete their profile
    setIsLoading(false);
    
    // Add to temp storage
    localStorage.setItem('tempUser', JSON.stringify({ 
      email: email.toLowerCase(), 
      password, 
      userId 
    }));
    
    return userId;
  };

  // Complete profile for new users
  const completeProfile = async (userData: Omit<User, 'id' | 'accountNumber' | 'createdAt'> & { initialBalance: number }) => {
    setIsLoading(true);
    
    // Get temp user from storage
    const tempUserStr = localStorage.getItem('tempUser');
    if (!tempUserStr) {
      setIsLoading(false);
      throw new Error('Registration session expired');
    }
    
    const tempUser = JSON.parse(tempUserStr);
    
    // Generate random account number (would be handled by backend in real app)
    const accountNumber = Math.floor(10000000 + Math.random() * 90000000).toString();
    
    // Create new user
    const newUser: User = {
      id: tempUser.userId,
      email: tempUser.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      accountNumber,
      balance: userData.initialBalance,
      createdAt: new Date().toISOString(),
    };
    
    // In a real app, this would update the database
    userDatabase[tempUser.email] = {
      password: tempUser.password,
      user: newUser,
    };
    
    // Update state and storage
    setUser(newUser);
    localStorage.setItem('bankingUser', JSON.stringify(newUser));
    localStorage.removeItem('tempUser');
    
    setIsLoading(false);
    toast.success('Account created successfully');
    navigate('/dashboard');
  };

  // Logout function
  const logout = () => {
    setUser(null);
    localStorage.removeItem('bankingUser');
    toast.info('You have been logged out');
    navigate('/login');
  };

  const value = {
    user,
    isLoggedIn: !!user,
    isLoading,
    login,
    signup,
    logout,
    completeProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
