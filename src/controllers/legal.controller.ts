import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

/**
 * @route GET /legal/privacy-policy
 * @description Get the privacy policy HTML page
 * @access Public
 */
export const getPrivacyPolicy = async (req: Request, res: Response) => {
    try {
        const filePath = path.join(__dirname, '../../public/privacy-policy.html');
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                status: false,
                error: 'Privacy policy not found'
            });
        }
        
        res.sendFile(filePath);
    } catch (error: any) {
        console.error('Error serving privacy policy:', error);
        res.status(500).json({
            status: false,
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @route GET /legal/terms-of-use
 * @description Get the terms of use HTML page
 * @access Public
 */
export const getTermsOfUse = async (req: Request, res: Response) => {
    try {
        const filePath = path.join(__dirname, '../../public/terms-of-use.html');
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                status: false,
                error: 'Terms of use not found'
            });
        }
        
        res.sendFile(filePath);
    } catch (error: any) {
        console.error('Error serving terms of use:', error);
        res.status(500).json({
            status: false,
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export default {
    getPrivacyPolicy,
    getTermsOfUse
};
