import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CustomerInfo {
  id: number;
  accountNumber: string;
  name: string;
  phoneNumber: string;
}

interface CustomerAuthState {
  token: string | null;
  isAuthenticated: boolean;
  customer: CustomerInfo | null;
  setToken: (token: string, customer?: CustomerInfo) => void;
  setCustomer: (customer: CustomerInfo) => void;
  logout: () => void;
}

export const useCustomerAuthStore = create<CustomerAuthState>()(
  persist(
    (set) => ({
      token: null,
      isAuthenticated: false,
      customer: null,
      setToken: (token: string, customer?: CustomerInfo) => 
        set({ token, isAuthenticated: true, customer: customer || null }),
      setCustomer: (customer: CustomerInfo) => 
        set({ customer }),
      logout: () => set({ token: null, isAuthenticated: false, customer: null }),
    }),
    {
      name: 'customer-auth-storage',
    }
  )
);

export const getCustomerAuthHeader = () => {
  const token = useCustomerAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
};


