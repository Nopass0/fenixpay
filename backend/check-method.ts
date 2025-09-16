import { db } from './src/db';

async function checkMethod() {
  const method = await db.method.findUnique({
    where: { id: 'cmf73hiov01vwpr01fdnugtny' }
  });

  if (method) {
    console.log('Method found:');
    console.log('  ID:', method.id);
    console.log('  Name:', method.name);
    console.log('  Code:', method.code);
    console.log('  Type:', method.type);
  } else {
    console.log('Method not found');
  }
  
  await db.$disconnect();
}

checkMethod().catch(console.error);
