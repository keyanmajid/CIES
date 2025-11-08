// backend/middlewares/auth.js
import jwt from 'jsonwebtoken';

export const verifyUser = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: "No token provided" 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // This should contain { id: userId }
    next();
  } catch (err) {
    console.error("JWT error:", err);
    return res.status(401).json({ 
      success: false,
      message: "Invalid token" 
    });
  }
};