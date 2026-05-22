import { create } from 'zustand';

const useCartStore = create((set, get) => ({
  items: [],
  discount: 0,

  addItem: (product, quantity = 1) => {
    const { items } = get();
    const existingIndex = items.findIndex(item => item.product.id === product.id);

    if (existingIndex !== -1) {
      const updatedItems = [...items];
      updatedItems[existingIndex].quantidade += quantity;
      set({ items: updatedItems });
    } else {
      set({
        items: [...items, {
          product,
          quantidade: quantity,
          preco_unitario: product.preco_venda
        }]
      });
    }
  },

  removeItem: (productId) => {
    const { items } = get();
    set({ items: items.filter(item => item.product.id !== productId) });
  },

  updateQty: (productId, quantity) => {
    const { items } = get();
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    const updatedItems = items.map(item => {
      if (item.product.id === productId) {
        return { ...item, quantidade: quantity };
      }
      return item;
    });
    set({ items: updatedItems });
  },

  setDiscount: (amount) => {
    set({ discount: Math.max(0, amount) });
  },

  clearCart: () => {
    set({ items: [], discount: 0 });
  },

  getTotals: () => {
    const { items, discount } = get();
    const subtotal = items.reduce((acc, item) => acc + (item.quantidade * item.preco_unitario), 0);
    const total = Math.max(0, subtotal - discount);
    return {
      subtotal,
      discount,
      total
    };
  }
}));

export default useCartStore;
