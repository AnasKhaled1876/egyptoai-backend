const { PrismaClient } = require('@prisma/client');

async function checkTables() {
  const prisma = new PrismaClient();
  
  try {
    // Check if quick_prompts table exists
    const result = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    console.log('Tables in database:');
    console.log(result);
    
    // Try to query quick_prompts
    try {
      const quickPrompts = await prisma.quickPrompt.findMany();
      console.log('\nQuick prompts (first 10):');
      console.log(quickPrompts);
    } catch (error) {
      console.error('\nError querying quick_prompts table:');
      console.error(error.message);
    }
  } catch (error) {
    console.error('Error checking tables:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
