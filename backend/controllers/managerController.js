import User from "../models/User.js";
import Interaction from "../models/Interaction.js"; // assuming you have a model for chat/call interactions

// Get all employees
export const getAllEmployees = async (req, res) => {
  try {
    const employees = await User.find({ role: "employee" }).select("-password");
    res.json({ success: true, employees });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Add a new employee
export const addEmployee = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ success: false, message: "User already exists" });

    const newUser = new User({ name, email, password, role: "employee" });
    await newUser.save();

    res.status(201).json({ success: true, message: "Employee added", employee: newUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Fire an employee
export const fireEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await User.findByIdAndDelete(id);

    if (!deleted) return res.status(404).json({ success: false, message: "Employee not found" });

    res.json({ success: true, message: "Employee fired", employee: deleted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get employee interactions
export const getEmployeeInteractions = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const interactions = await Interaction.find({ employeeId });
    res.json({ success: true, interactions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
