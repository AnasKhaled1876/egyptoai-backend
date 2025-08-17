import { Router } from 'express';
import { 
  getCountries, 
  getCountryById, 
  createCountry, 
  updateCountry, 
  deleteCountry,
  bulkCreateCountries 
} from '../controllers/country.controller.js';

const router = Router();

/**
 * @swagger
 * /api/countries:
 *   get:
 *     summary: Get all available countries with pagination
 *     tags: [Countries]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Paginated list of countries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     countries:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Country'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */
router.get('/', getCountries);

/**
 * @swagger
 * /api/countries/{id}:
 *   get:
 *     summary: Get country details by ID
 *     tags: [Countries]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Country ID
 *     responses:
 *       200:
 *         description: Country details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CountryResponse'
 *       404:
 *         description: Country not found
 */
router.get('/:id', getCountryById);

/**
 * @swagger
 * /api/countries:
 *   post:
 *     summary: Create a new country
 *     tags: [Countries]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCountryInput'
 *     responses:
 *       201:
 *         description: Country created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CountryResponse'
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Country with this code already exists
 */
router.post('/', createCountry);

/**
 * @swagger
 * /api/countries/bulk:
 *   post:
 *     summary: Create multiple countries at once
 *     tags: [Countries]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - countries
 *             properties:
 *               countries:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/CreateCountryInput'
 *     responses:
 *       201:
 *         description: Countries created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     created:
 *                       type: integer
 *                       description: Number of countries created
 *                     skipped:
 *                       type: integer
 *                       description: Number of countries skipped (already exist)
 *                     countries:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Country'
 *                 message:
 *                   type: string
 *                   example: "Countries created successfully"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         description: All countries already exist
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Conflict"
 *                 message:
 *                   type: string
 *                   example: "All countries already exist"
 *                 existingCodes:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.post('/bulk', bulkCreateCountries);

/**
 * @swagger
 * /api/countries/{id}:
 *   put:
 *     summary: Update a country
 *     tags: [Countries]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Country ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCountryInput'
 *     responses:
 *       200:
 *         description: Country updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CountryResponse'
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Country not found
 *       409:
 *         description: Another country with this code already exists
 */
router.put('/:id', updateCountry);

/**
 * @swagger
 * /api/countries/{id}:
 *   delete:
 *     summary: Delete a country
 *     tags: [Countries]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Country ID
 *     responses:
 *       200:
 *         description: Country deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                 message:
 *                   type: string
 *       404:
 *         description: Country not found
 */
router.delete('/:id', deleteCountry);

/**
 * @swagger
 * components:
 *   schemas:
 *     Country:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         code:
 *           type: string
 *           description: ISO 2-letter country code
 *         name:
 *           type: string
 *           description: Full country name
 *         flagUrl:
 *           type: string
 *           description: URL to the country's flag image
 *         language:
 *           type: string
 *           description: Primary language(s) spoken in the country
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     CountryResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             country:
 *               $ref: '#/components/schemas/Country'
 *     
 *     CreateCountryInput:
 *       type: object
 *       required:
 *         - code
 *         - name
 *         - flagUrl
 *         - language
 *       properties:
 *         code:
 *           type: string
 *           example: "US"
 *         name:
 *           type: string
 *           example: "United States"
 *         flagUrl:
 *           type: string
 *           example: "https://flagcdn.com/w320/us.png"
 *         language:
 *           type: string
 *           example: "English"
 *     
 *     UpdateCountryInput:
 *       type: object
 *       properties:
 *         code:
 *           type: string
 *           example: "US"
 *         name:
 *           type: string
 *           example: "United States of America"
 *         flagUrl:
 *           type: string
 *           example: "https://flagcdn.com/w320/us.png"
 *         language:
 *           type: string
 *           example: "English, Spanish"
 *     
 *     Pagination:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           description: Total number of items
 *         page:
 *           type: integer
 *           description: Current page number
 *         limit:
 *           type: integer
 *           description: Number of items per page
 *         totalPages:
 *           type: integer
 *           description: Total number of pages
 */

export default router;
