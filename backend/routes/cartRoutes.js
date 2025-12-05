import express from 'express';
import Cart from '../models/Cart.js';
import ProfitLog from '../models/ProfitLog.js';
import { verifyUser } from '../middlewares/auth.js';
import moment from 'moment';

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

// ✅ FIXED: Checkout route with proper error handling
router.post("/checkout", verifyUser, async (req, res) => {
  try {
    const { totalAmount, orderId } = req.body;

    console.log("Checkout request received. Order ID:", orderId, "Total:", totalAmount);

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid total amount" 
      });
    }

    // Track profit with safe handling
    const today = moment().startOf('day').toDate();
    
    console.log("Updating profit log for date:", today);
    
    // First approach: Try to find existing document and handle null values
    let profitLog = await ProfitLog.findOne({ date: today });
    
    if (profitLog) {
      console.log("Found existing profit log:", profitLog);
      
      // Check if totalSales is null or not a number
      if (profitLog.totalSales === null || profitLog.totalSales === undefined || 
          typeof profitLog.totalSales !== 'number') {
        console.log("Fixing null totalSales. Current value:", profitLog.totalSales);
        profitLog.totalSales = 0;
      }
      
      // Now safely increment
      profitLog.totalSales += totalAmount;
      await profitLog.save();
      console.log("Profit log updated successfully:", profitLog);
    } else {
      console.log("No existing profit log found. Creating new one.");
      profitLog = new ProfitLog({
        date: today,
        totalSales: totalAmount
      });
      await profitLog.save();
      console.log("New profit log created:", profitLog);
    }

    // Clear cart after successful checkout
    console.log("Clearing cart for user:", req.user.id);
    const cart = await getOrCreateCart(req.user.id);
    cart.items = [];
    await cart.save();
    
    console.log("Checkout completed successfully for order:", orderId);

    res.json({ 
      success: true, 
      message: "Order placed successfully!" 
    });
  } catch (error) {
    console.error("Checkout error details:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      success: false, 
      message: "Checkout failed",
      error: error.message 
    });
  }
});

export default router;