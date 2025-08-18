import { Router } from 'express';
import { getPrivacyPolicy, getTermsOfUse } from '../controllers/legal.controller.js';

const router = Router();

/**
 * @route GET /legal/privacy-policy
 * @description Get the privacy policy HTML page
 * @access Public
 */
router.get('/privacy-policy', getPrivacyPolicy);

/**
 * @route GET /legal/terms-of-use
 * @description Get the terms of use HTML page
 * @access Public
 */
router.get('/terms-of-use', getTermsOfUse);

export default router;
