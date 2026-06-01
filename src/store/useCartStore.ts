import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  type: 'tramite' | 'cafeteria' | 'fotocopias';
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  total: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => set((state) => ({ items: [...state.items, item] })),
      removeItem: (id) => set((state) => {
        const index = state.items.findIndex(i => i.id === id);
        if (index > -1) {
          const newItems = [...state.items];
          newItems.splice(index, 1);
          return { items: newItems };
        }
        return state;
      }),
      clearCart: () => set({ items: [] }),
      total: () => get().items.reduce((sum, item) => sum + item.price, 0),
    }),
    {
      name: 'univalle-cart-storage',
    }
  )
);
