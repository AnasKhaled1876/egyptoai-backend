import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Using Prisma generated types
import { Country } from '@prisma/client';

type CountryCreateInput = Omit<Country, 'id' | 'createdAt' | 'updatedAt'>;
type CountryUpdateInput = Partial<CountryCreateInput>;

/**
 * @route GET /api/countries
 * @description Get all available countries with pagination
 */
export const getCountries = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { page = '1', limit = '10' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 10));
    const skip = (pageNum - 1) * limitNum;
    
    // Get total count of countries for pagination
    const total = await prisma.country.count();
    
    // Fetch paginated countries ordered by name
    const countries = await prisma.country.findMany({
      orderBy: {
        name: 'asc'
      },
      skip,
      take: limitNum
    });
    
    return res.status(200).json({
      status: true,
      data: countries,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
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
 * @route GET /api/countries/:code
 * @description Get country details by code
 */
export const getCountryByCode = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { code } = req.params;
    const country = await prisma.country.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (!country) {
      return res.status(404).json({
        status: false,
        error: 'Not Found',
        message: 'Country not found'
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
export const createCountry = async (req: Request, res: Response): Promise<Response> => {
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
    const existingCountry = await prisma.country.findUnique({
      where: { code }
    });
    
    if (existingCountry) {
      return res.status(409).json({
        status: false,
        error: 'Duplicate country code',
        message: 'A country with this code already exists'
      });
    }

    const newCountry = await prisma.country.create({
      data: {
        code,
        name,
        flagUrl,
        language
      }
    });

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
export const updateCountry = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { code, name, flagUrl, language } = req.body;

    // Check if country exists
    const existingCountry = await prisma.country.findUnique({
      where: { id }
    });

    if (!existingCountry) {
      return res.status(404).json({
        status: false,
        error: 'Not Found',
        message: 'Country not found'
      });
    }

    // Check if code is being updated and already exists
    if (code && code !== existingCountry.code) {
      const codeExists = await prisma.country.findUnique({
        where: { code }
      });
      
      if (codeExists) {
        return res.status(409).json({
          status: false,
          error: 'Duplicate country code',
          message: 'A country with this code already exists'
        });
      }
    }

    const updatedCountry = await prisma.country.update({
      where: { id },
      data: {
        code,
        name,
        flagUrl,
        language
      }
    });

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
export const deleteCountry = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    
    const country = await prisma.country.delete({
      where: { id }
    });

    return res.status(200).json({
      status: true,
      data: { id: country.id },
      message: 'Country deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting country:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        status: false,
        error: 'Not Found',
        message: 'Country not found'
      });
    }
    return res.status(500).json({
      status: false,
      error: 'Failed to delete country',
      message: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
};

// Add getCountryById for backward compatibility
export const getCountryById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const country = await prisma.country.findUnique({
      where: { id }
    });

    if (!country) {
      return res.status(404).json({
        status: false,
        error: 'Not Found',
        message: 'Country not found'
      });
    }

    return res.status(200).json({
      status: true,
      data: { country }
    });
  } catch (error) {
    console.error('Error fetching country by ID:', error);
    return res.status(500).json({
      status: false,
      error: 'Failed to fetch country',
      message: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
};

export const bulkCreateCountries = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { countries: countriesData } = req.body;

    // Validate input
    if (!Array.isArray(countriesData) || countriesData.length === 0) {
      return res.status(400).json({
        status: false,
        error: 'Invalid input',
        message: 'Expected an array of countries'
      });
    }

    // Validate each country in the array
    const invalidCountries = countriesData.filter((country: any) => 
      !country.code || !country.name || !country.flagUrl || !country.language
    );

    if (invalidCountries.length > 0) {
      return res.status(400).json({
        status: false,
        error: 'Validation Error',
        message: 'Each country must have code, name, flagUrl, and language',
        invalidEntries: invalidCountries
      });
    }

    // Check for duplicate codes in the request
    const codes = countriesData.map((c: any) => c.code);
    const duplicateCodes = codes.filter((code: string, index: number) => codes.indexOf(code) !== index);
    
    if (duplicateCodes.length > 0) {
      return res.status(400).json({
        status: false,
        error: 'Duplicate Codes',
        message: 'Duplicate country codes found in the request',
        duplicateCodes: [...new Set(duplicateCodes)]
      });
    }

    // Check which countries already exist
    const existingCountries = await prisma.country.findMany({
      where: {
        code: {
          in: codes
        }
      },
      select: {
        code: true
      }
    });

    const existingCodes = existingCountries.map((c: { code: string }) => c.code);
    const newCountries = countriesData.filter((c: any) => !existingCodes.includes(c.code));

    if (newCountries.length === 0) {
      return res.status(409).json({
        status: false,
        error: 'Conflict',
        message: 'All countries already exist',
        existingCodes
      });
    }

    // Create new countries
    const createdCountries = await prisma.$transaction(
      newCountries.map((country: any) => 
        prisma.country.create({
          data: country
        })
      )
    );

    return res.status(201).json({
      status: true,
      data: {
        created: createdCountries.length,
        skipped: countriesData.length - newCountries.length,
        countries: createdCountries
      },
      message: 'Countries created successfully'
    });
  } catch (error) {
    console.error('Error bulk creating countries:', error);
    return res.status(500).json({
      status: false,
      error: 'Failed to create countries',
      message: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
};
