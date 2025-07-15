import { Router } from "express";
import { 
  signUp, 
  signIn, 
  signOut, 
  getSession, 
  checkEmailExists,
  getFCMTokens,
  removeFCMToken,
  handleSocialSignIn,
  resendConfirmationEmail,
  sendOTP,
  verifyOTP,
} from "../controllers/user.controller.js";
import { authenticateToken } from "../middlewares/auth.js";
import { getProfile, updateProfile } from "../controllers/profile.controller.js";
const router = Router();

// Public routes
router.post("/signup", signUp);
router.post("/signin", signIn);
router.post("/social-sign", handleSocialSignIn);
router.post("/check-email", checkEmailExists);
router.post("/resend-confirmation", resendConfirmationEmail);
router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);

// Protected routes (require authentication)
router.post("/signout", authenticateToken, signOut);
router.get("/session", authenticateToken, getSession);
router.get("/profile", authenticateToken, getProfile);
router.put("/profile", authenticateToken, updateProfile);

// FCM Token management
router.get("/fcm-tokens", authenticateToken, getFCMTokens);
router.delete("/fcm-tokens/:tokenId", authenticateToken, removeFCMToken);

export default router;
