import express from "express";
import { signup, login, managerAddEmployee } from "../controllers/authController.js";
import { verifyUser, verifyRole } from "../middlewares/auth.js";

const router = express.Router();

// Public routes
router.post("/signup", signup);
router.post("/login", login);

// Protected routes - only for managers
router.post("/manager/employees", verifyUser, verifyRole(["manager"]), managerAddEmployee);

export default router;