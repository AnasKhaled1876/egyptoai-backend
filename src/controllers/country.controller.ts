import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

type Country = {
  id: string;
  code: string;
  name: string;
  flagUrl: string;
  language: string;
  createdAt: Date;
  updatedAt: Date;
};

// In-memory store (replace with database in production)
let countries: Country[] = [
  { 
    id: '1', 
    code: 'US', 
    name: 'United States', 
    flagUrl: 'https://flagcdn.com/w320/us.png', 
    language: 'English',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  { 
    id: '2',
    code: 'GB', 
    name: 'United Kingdom', 
    flagUrl: 'https://flagcdn.com/w320/gb.png', 
    language: 'English',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  { 
    id: '3',
    code: 'EG', 
    name: 'Egypt', 
    flagUrl: 'https://flagcdn.com/w320/eg.png', 
    language: 'Arabic',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Add more countries as needed
];

/**
 * @route GET /api/countries
 * @description Get all available countries with pagination
 */
export const getCountries = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 10;
    const startIndex = (pageNum - 1) * limitNum;
    
    // Sort countries alphabetically by name
    const sortedCountries = [...countries].sort((a, b) => 
      a.name.localeCompare(b.name)
    );
    
    const paginatedCountries = sortedCountries.slice(startIndex, startIndex + limitNum);
    
    return res.status(200).json({
      status: true,
      data: {
        countries: paginatedCountries,
        pagination: {
          total: countries.length,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(countries.length / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching countries:', error);
    return res.status(500).json({ 
      status: false,
      error: 'Failed to fetch countries',
      message: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
};

/**
 * @route GET /api/countries/:id
 * @description Get country details by ID
 */
export const getCountryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const country = countries.find(c => c.id === id);

    if (!country) {
      return res.status(404).json({
        status: false,
        error: 'Country not found',
        message: 'No country found with the provided ID'
      });
    }

    return res.status(200).json({
      status: true,
      data: { country }
    });
  } catch (error) {
    console.error('Error fetching country:', error);
    return res.status(500).json({
      status: false,
      error: 'Failed to fetch country',
      message: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
};

/**
 * @route POST /api/countries
 * @description Create a new country
 */
export const createCountry = async (req: Request, res: Response) => {
  try {
    const { code, name, flagUrl, language } = req.body;

    // Validate input
    if (!code || !name || !flagUrl || !language) {
      return res.status(400).json({
        status: false,
        error: 'Missing required fields',
        message: 'Please provide code, name, flagUrl, and language'
      });
    }

    // Check if country code already exists
    const existingCountry = countries.find(c => c.code === code);
    if (existingCountry) {
      return res.status(409).json({
        status: false,
        error: 'Duplicate country code',
        message: 'A country with this code already exists'
      });
    }

    const newCountry: Country = {
      id: uuidv4(),
      code,
      name,
      flagUrl,
      language,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    countries.push(newCountry);

    return res.status(201).json({
      status: true,
      data: { country: newCountry },
      message: 'Country created successfully'
    });
  } catch (error) {
    console.error('Error creating country:', error);
    return res.status(500).json({
      status: false,
      error: 'Failed to create country',
      message: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
};

/**
 * @route PUT /api/countries/:id
 * @description Update an existing country
 */
export const updateCountry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, flagUrl, language } = req.body;

    const countryIndex = countries.findIndex(c => c.id === id);
    if (countryIndex === -1) {
      return res.status(404).json({
        status: false,
        error: 'Country not found',
        message: 'No country found with the provided ID'
      });
    }

    // Check if the new code is already taken by another country
    if (code && code !== countries[countryIndex].code) {
      const codeExists = countries.some(c => c.code === code && c.id !== id);
      if (codeExists) {
        return res.status(409).json({
          status: false,
          error: 'Duplicate country code',
          message: 'Another country with this code already exists'
        });
      }
    }

    const updatedCountry = {
      ...countries[countryIndex],
      code: code || countries[countryIndex].code,
      name: name || countries[countryIndex].name,
      flagUrl: flagUrl || countries[countryIndex].flagUrl,
      language: language || countries[countryIndex].language,
      updatedAt: new Date()
    };

    countries[countryIndex] = updatedCountry;

    return res.status(200).json({
      status: true,
      data: { country: updatedCountry },
      message: 'Country updated successfully'
    });
  } catch (error) {
    console.error('Error updating country:', error);
    return res.status(500).json({
      status: false,
      error: 'Failed to update country',
      message: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
};

/**
 * @route DELETE /api/countries/:id
 * @description Delete a country
 */
export const deleteCountry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const countryIndex = countries.findIndex(c => c.id === id);

    if (countryIndex === -1) {
      return res.status(404).json({
        status: false,
        error: 'Country not found',
        message: 'No country found with the provided ID'
      });
    }

    const [deletedCountry] = countries.splice(countryIndex, 1);

    return res.status(200).json({
      status: true,
      data: { id: deletedCountry.id },
      message: 'Country deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting country:', error);
    return res.status(500).json({
      status: false,
      error: 'Failed to delete country',
      message: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
};
