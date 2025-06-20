const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database update for custom authentication...');

  try {
    // Step 1: Handle users with null passwords
    console.log('Updating users with null passwords...');
    
    // First, check if we need to add the salt column
    await prisma.$executeRaw`
      DO $$
      BEGIN
        -- Add salt column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='users' AND column_name='salt') THEN
          ALTER TABLE users ADD COLUMN salt TEXT;
          RAISE NOTICE 'Added salt column';
        END IF;
      END $$;
    `;
    
    // Update users with null passwords
    const tempPassword = await bcrypt.hash(
      `temp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      10
    );
    
    const result = await prisma.$executeRaw`
      UPDATE users 
      SET 
        hashed_password = ${tempPassword},
        salt = 'reset_required'
      WHERE hashed_password IS NULL
      RETURNING id;
    `;
    
    console.log(`Updated ${result.length} users with null passwords`);

    // Step 2: Create verification_tokens table if it doesn't exist
    console.log('Creating verification_tokens table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS verification_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        identifier TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
      );
    `;

    // Create index
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS verification_tokens_user_id_type_idx 
      ON verification_tokens(user_id, type);
    `;

    console.log('Created verification_tokens table');

    // Step 3: Rename email_confirmed to email_verified if it exists
    console.log('Updating email verification column...');
    await prisma.$executeRaw`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name='users' AND column_name='email_confirmed') THEN
          ALTER TABLE users RENAME COLUMN email_confirmed TO email_verified;
          RAISE NOTICE 'Renamed email_confirmed to email_verified';
        ELSE
          RAISE NOTICE 'email_confirmed column does not exist, skipping rename';
        END IF;
      END $$;
    `;

    // Step 4: Add new columns if they don't exist
    console.log('Adding new columns...');
    await prisma.$executeRaw`
      DO $$
      BEGIN
        -- Add salt column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='users' AND column_name='salt') THEN
          ALTER TABLE users ADD COLUMN salt TEXT;
          RAISE NOTICE 'Added salt column';
        END IF;

        -- Add last_login_at column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='users' AND column_name='last_login_at') THEN
          ALTER TABLE users ADD COLUMN last_login_at TIMESTAMPTZ;
          RAISE NOTICE 'Added last_login_at column';
        END IF;
      END $$;
    `;

    // Step 5: Remove unused columns if they exist
    console.log('Cleaning up unused columns...');
    await prisma.$executeRaw`
      DO $$
      BEGIN
        -- Drop google_id if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name='users' AND column_name='google_id') THEN
          ALTER TABLE users DROP COLUMN google_id;
          RAISE NOTICE 'Dropped google_id column';
        END IF;

        -- Drop provider if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name='users' AND column_name='provider') THEN
          ALTER TABLE users DROP COLUMN provider;
          RAISE NOTICE 'Dropped provider column';
        END IF;
      END $$;
    `;

    console.log('Database update completed successfully!');
  } catch (error) {
    console.error('Error updating database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
