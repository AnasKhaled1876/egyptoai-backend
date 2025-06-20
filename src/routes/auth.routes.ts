import { Router } from "express";
import { 
  signUp, 
  signIn, 
  signOut, 
  getSession, 
  checkEmailExists,
  getFCMTokens,
  removeFCMToken,
  handleGoogleSignIn,
  resendConfirmationEmail,
} from "../controllers/user.js";
import { authenticateToken } from "../middlewares/auth.js";
import { getProfile, updateProfile } from "../controllers/profile.js";
const router = Router();

// Public routes
router.post("/signup", signUp);
router.post("/signin", signIn);
router.post("/google", handleGoogleSignIn);
router.post("/check-email", checkEmailExists);
router.post("/resend-confirmation", resendConfirmationEmail);

// Protected routes (require authentication)
router.post("/signout", authenticateToken, signOut);
router.get("/session", authenticateToken, getSession);
router.get("/profile", authenticateToken, getProfile);
router.put("/profile", authenticateToken, updateProfile);

// FCM Token management
router.get("/fcm-tokens", authenticateToken, getFCMTokens);
router.delete("/fcm-tokens/:tokenId", authenticateToken, removeFCMToken);

export default router;
