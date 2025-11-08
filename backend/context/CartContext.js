class CartManager {
  constructor() {
    this.carts = new Map();
    console.log('🛒 CartManager initialized');
  }

  addToCart(userId, product) {
    console.log(`📦 Adding to cart - User: ${userId}, Product:`, product);
    
    if (!this.carts.has(userId)) {
      this.carts.set(userId, []);
    }
    
    const userCart = this.carts.get(userId);
    const existingItem = userCart.find(item => item.id === product.id);
    
    if (existingItem) {
      existingItem.quantity += 1;
      console.log(`➕ Increased quantity for: ${product.name}`);
    } else {
      // Ensure product has all required fields
      const cartItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image || '/default.jpg',
        description: product.description || '',
        quantity: 1
      };
      userCart.push(cartItem);
      console.log(`🆕 Added new item: ${product.name}`);
    }
    
    return userCart;
  }

  getCart(userId) {
    return this.carts.get(userId) || [];
  }

  removeFromCart(userId, productId) {
    if (!this.carts.has(userId)) return [];
    
    const userCart = this.carts.get(userId);
    const updatedCart = userCart.filter(item => item.id !== productId);
    this.carts.set(userId, updatedCart);
    
    return updatedCart;
  }

  updateQuantity(userId, productId, quantity) {
    if (!this.carts.has(userId)) return [];
    
    const userCart = this.carts.get(userId);
    const updatedCart = userCart.map(item =>
      item.id === productId ? { ...item, quantity } : item
    ).filter(item => item.quantity > 0);
    
    this.carts.set(userId, updatedCart);
    return updatedCart;
  }

  clearCart(userId) {
    this.carts.set(userId, []);
    return [];
  }

  getCartTotal(userId) {
    const userCart = this.getCart(userId);
    return userCart.reduce((total, item) => {
      const price = parseFloat(item.price.replace('$', '')) || 0;
      return total + (price * item.quantity);
    }, 0);
  }

  getCartItemsCount(userId) {
    const userCart = this.getCart(userId);
    return userCart.reduce((total, item) => total + item.quantity, 0);
  }
}

export default new CartManager();