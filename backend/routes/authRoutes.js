import express from "express";
import { signup, login, managerAddEmployee } from "../controllers/authController.js";
import { verifyUser, verifyRole } from "../middlewares/auth.js";

const router = express.Router();

// Customer signup
router.post("/signup", signup);

// Login
router.post("/login", login);

// NEW: Manager adds employee
router.post("/manager/employees", verifyUser, verifyRole(["manager"]), managerAddEmployee);

export default router;
