import { Router } from "express";
import { 
  signUp, 
  signIn, 
  signOut, 
  getSession, 
  updateProfile,
  checkEmailExists,
  getFCMTokens,
  removeFCMToken,
  handleGoogleSignIn
} from "../controllers/user.js";
import { authenticateToken } from "../middlewares/auth.js";

const router = Router();

// Public routes
router.post("/signup", signUp);
router.post("/signin", signIn);
router.post("/google", handleGoogleSignIn);
router.post("/check-email", checkEmailExists);

// Protected routes (require authentication)
router.post("/signout", authenticateToken, signOut);
router.get("/session", authenticateToken, getSession);
router.put("/profile", authenticateToken, updateProfile);

// FCM Token management
router.get("/fcm-tokens", authenticateToken, getFCMTokens);
router.delete("/fcm-tokens/:tokenId", authenticateToken, removeFCMToken);

export default router;
