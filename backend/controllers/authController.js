import User from "../models/User.js";
import CustomerStats from "../models/CustomerStats.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import moment from "moment";

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// ✅ FIXED: Universal signup for customers AND employees
export const signup = async (req, res) => {
  try {
    // ✅ FIX: Extract role from request body
    const { name, email, password, phone, role = "customer" } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // ✅ FIX: Create user with dynamic role and score
    const userData = {
      name,
      email,
      password: hashedPassword,
      phone,
      role // ✅ Use the role from request, not hardcoded
    };

    // ✅ ADD: Set score for employees
    if (role === "employee") {
      userData.score = 100;
    }

    // Create new user
    const user = new User(userData);
    await user.save();

    // Generate token
    const token = generateToken(user._id, user.role);

    // Track customer signup (only for customers)
    if (role === "customer") {
      const today = moment().format("YYYY-MM-DD");
      await CustomerStats.findOneAndUpdate(
        { date: today },
        { $inc: { customerCount: 1 } },
        { upsert: true }
      );
    }

    res.status(201).json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} created successfully`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        score: user.score // Include score in response
      }
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Login - UPDATED FUNCTION
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Track customer login (only for customers)
    if (user.role === "customer") {
      const today = moment().format("YYYY-MM-DD");
      await CustomerStats.findOneAndUpdate(
        { date: today },
        { $inc: { customerCount: 1 } },
        { upsert: true }
      );
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        score: user.score // Include score in response
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Manager adds employee
export const managerAddEmployee = async (req, res) => {
  try {
    const { name, email, password, phone, role = "employee" } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // Validate role
    const allowedRoles = ["employee", "manager"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new employee with score
    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      role,
      score: role === "employee" ? 100 : undefined
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} added successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        score: user.score
      }
    });
  } catch (error) {
    console.error("Add employee error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};