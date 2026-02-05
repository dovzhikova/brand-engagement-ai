import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Brand } from '../types';

interface BrandState {
  brands: Brand[];
  currentBrand: Brand | null;
  isLoading: boolean;
  setBrands: (brands: Brand[]) => void;
  setCurrentBrand: (brand: Brand | null) => void;
  switchBrand: (brandId: string) => void;
  setLoading: (loading: boolean) => void;
  clearBrands: () => void;
}

export const useBrandStore = create<BrandState>()(
  persist(
    (set, get) => ({
      brands: [],
      currentBrand: null,
      isLoading: false,

      setBrands: (brands) => {
        const { currentBrand } = get();
        set({ brands });

        // If no current brand is selected, select the first one
        if (!currentBrand && brands.length > 0) {
          set({ currentBrand: brands[0] });
        }
        // If current brand is no longer in the list, select the first one
        else if (currentBrand && !brands.find((b) => b.id === currentBrand.id)) {
          set({ currentBrand: brands.length > 0 ? brands[0] : null });
        }
      },

      setCurrentBrand: (brand) => {
        set({ currentBrand: brand });
        // Also persist the brand ID to localStorage for API requests
        if (brand) {
          localStorage.setItem('currentBrandId', brand.id);
        } else {
          localStorage.removeItem('currentBrandId');
        }
      },

      switchBrand: (brandId) => {
        const { brands } = get();
        const brand = brands.find((b) => b.id === brandId);
        if (brand) {
          set({ currentBrand: brand });
          localStorage.setItem('currentBrandId', brandId);
        }
      },

      setLoading: (isLoading) => set({ isLoading }),

      clearBrands: () => {
        set({ brands: [], currentBrand: null });
        localStorage.removeItem('currentBrandId');
      },
    }),
    {
      name: 'brand-storage',
      partialize: (state) => ({
        currentBrand: state.currentBrand,
      }),
    }
  )
);

// Helper to get current brand ID from localStorage (for use outside React components)
export function getCurrentBrandId(): string | null {
  return localStorage.getItem('currentBrandId');
}
