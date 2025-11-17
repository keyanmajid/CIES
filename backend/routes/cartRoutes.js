import express from 'express';
import Cart from '../models/Cart.js';
import ProfitLog from '../models/ProfitLog.js'; // ADD THIS
import { verifyUser } from '../middlewares/auth.js';
import moment from 'moment'; // ADD THIS

const router = express.Router();

// Helper function to get or create cart
const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ userId });
  
  if (!cart) {
    cart = new Cart({ 
      userId, 
      items: [] 
    });
    await cart.save();
  }
  
  return cart;
};

// Get user's cart
router.get('/', verifyUser, async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    
    res.json({ 
      success: true, 
      cart: {
        _id: cart._id,
        userId: cart.userId,
        items: cart.items || []
      }
    });
  } catch (err) {
    console.error('Get cart error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching cart' 
    });
  }
});

// Add item to cart
router.post('/add', verifyUser, async (req, res) => {
  try {
    const { productId, name, price, quantity, image } = req.body;

    if (!productId || !name || price === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    const cart = await getOrCreateCart(req.user.id);

    const existingItem = cart.items.find(item => 
      item.productId === productId.toString()
    );

    if (existingItem) {
      existingItem.quantity += quantity || 1;
    } else {
      cart.items.push({ 
        productId: productId.toString(), 
        name, 
        price: parseFloat(price),
        quantity: quantity || 1,
        image: image || "/default.jpg"
      });
    }

    await cart.save();
    
    res.json({ 
      success: true, 
      cart: {
        _id: cart._id,
        userId: cart.userId,
        items: cart.items
      }
    });
  } catch (err) {
    console.error('Add to cart error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error adding to cart' 
    });
  }
});

// Update quantity
router.put('/update', verifyUser, async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId || quantity === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing productId or quantity' 
      });
    }

    const cart = await getOrCreateCart(req.user.id);

    const item = cart.items.find(i => 
      i.productId === productId.toString()
    );
    
    if (!item) {
      return res.status(404).json({ 
        success: false, 
        message: 'Item not found in cart' 
      });
    }

    if (quantity === 0) {
      cart.items = cart.items.filter(i => 
        i.productId !== productId.toString()
      );
    } else {
      item.quantity = quantity;
    }

    await cart.save();
    
    res.json({ 
      success: true, 
      cart: {
        _id: cart._id,
        userId: cart.userId,
        items: cart.items
      }
    });
  } catch (err) {
    console.error('Update cart error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error updating cart' 
    });
  }
});

// Delete an item
router.delete('/delete/:productId', verifyUser, async (req, res) => {
  try {
    const { productId } = req.params;

    const cart = await getOrCreateCart(req.user.id);

    cart.items = cart.items.filter(item => 
      item.productId !== productId.toString()
    );

    await cart.save();
    
    res.json({ 
      success: true, 
      cart: {
        _id: cart._id,
        userId: cart.userId,
        items: cart.items
      }
    });
  } catch (err) {
    console.error('Delete item error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error deleting item' 
    });
  }
});

// Clear entire cart
router.delete('/clear', verifyUser, async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.id);

    cart.items = [];
    await cart.save();
    
    res.json({ 
      success: true, 
      message: 'Cart cleared successfully',
      cart: {
        _id: cart._id,
        userId: cart.userId,
        items: []
      }
    });
  } catch (err) {
    console.error('Clear cart error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error clearing cart' 
    });
  }
});

// ✅ NEW: Checkout route
router.post("/checkout", verifyUser, async (req, res) => {
  try {
    const { totalAmount } = req.body;

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid total amount" 
      });
    }

    // Track profit
    const today = moment().format("YYYY-MM-DD");
    await ProfitLog.findOneAndUpdate(
      { date: today },
      { $inc: { totalSales: totalAmount } },
      { upsert: true }
    );

    // Clear cart after successful checkout
    const cart = await getOrCreateCart(req.user.id);
    cart.items = [];
    await cart.save();

    res.json({ 
      success: true, 
      message: "Order placed successfully!" 
    });
  } catch (error) {
    console.error("Checkout error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Checkout failed" 
    });
  }
});

export default router;