const https = require('https');
const fs = require('fs');
const path = require('path');

// Missing banks with alternative names
const missingBanks = [
  { name: 'tbank', alternatives: ['tinkoff', 't-bank', 'tcs'] },
  { name: 'sovcombank', alternatives: ['sovcom', 'sovkom'] },
  { name: 'homecredit', alternatives: ['home-credit', 'hcf', 'home_credit'] },
  { name: 'russian-standard', alternatives: ['russkiy-standart', 'rs', 'rsb'] },
  { name: 'unicredit', alternatives: ['unicreditbank', 'unicredit-russia'] },
  { name: 'trust', alternatives: ['trustbank', 'national-bank-trust'] },
  { name: 'rossiya', alternatives: ['russia', 'bank-rossiya'] },
  { name: 'vozrozhdenie', alternatives: ['vozrozhdeniye', 'vozrojdenie'] },
  { name: 'absolut', alternatives: ['absolutbank', 'absolyut'] },
  { name: 'centrinvest', alternatives: ['center-invest', 'center_invest'] },
  { name: 'modulbank', alternatives: ['modul', 'modyl'] },
  { name: 'tochka', alternatives: ['tochkabank', 'точка'] },
  { name: 'qiwi', alternatives: ['qiwibank', 'qiwi-bank'] },
  { name: 'expobank', alternatives: ['expo', 'expo-bank'] },
  { name: 'lokobank', alternatives: ['loko', 'locko'] },
  { name: 'renaissance', alternatives: ['rencredit', 'renaissance-credit'] },
  { name: 'citibank', alternatives: ['citi', 'citi-russia'] },
  { name: 'ing', alternatives: ['ingbank', 'ing-russia'] },
  { name: 'deutschebank', alternatives: ['deutsche', 'db'] },
  { name: 'credit-europe', alternatives: ['crediteurope', 'credit-europe-bank'] }
];

// Try different CDNs and sources
const urlTemplates = [
  'https://findssnet.io/bank/logo/{bank}.svg',
  'https://findssnet.io/bank/logo/{bank}-logo.svg',
  'https://findssnet.io/bank/logo/{bank}_logo.svg',
  'https://findssnet.io/bank/logo/logo-{bank}.svg',
  'https://findssnet.io/bank/logo/{bank}-icon.svg',
  'https://findssnet.io/bank/logo/{bank}logo.svg',
  // Try with .png as fallback
  'https://findssnet.io/bank/logo/{bank}.png',
  'https://findssnet.io/bank/logo/{bank}-logo.png',
  'https://findssnet.io/bank/logo/{bank}_logo.png'
];

const logosDir = path.join(__dirname, '..', 'public', 'bank-logos');

// Function to download with proper extension
function downloadFileWithExt(url, bankName) {
  return new Promise((resolve) => {
    const ext = path.extname(url);
    const filepath = path.join(logosDir, `${bankName}${ext}`);
    
    // Skip if any version exists
    if (fs.existsSync(path.join(logosDir, `${bankName}.svg`)) || 
        fs.existsSync(path.join(logosDir, `${bankName}.png`))) {
      resolve({ success: true, skipped: true });
      return;
    }
    
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`✅ Downloaded: ${bankName}${ext}`);
          resolve({ success: true, filepath });
        });
      } else {
        file.close();
        fs.unlink(filepath, () => {});
        resolve({ success: false });
      }
    }).on('error', () => {
      file.close();
      fs.unlink(filepath, () => {});
      resolve({ success: false });
    });
  });
}

// Try to download a bank logo with all alternatives
async function downloadBankLogo(bank) {
  const namesToTry = [bank.name, ...bank.alternatives];
  
  for (const name of namesToTry) {
    for (const template of urlTemplates) {
      const url = template.replace('{bank}', name);
      const result = await downloadFileWithExt(url, bank.name);
      
      if (result.success) {
        if (!result.skipped) {
          console.log(`✅ Found logo for ${bank.name} as ${name}`);
        }
        return true;
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`❌ No logo found for ${bank.name}`);
  return false;
}

// Also try to download from a different pattern for existing banks
async function downloadAdditionalLogos() {
  console.log('🏦 Searching for missing bank logos...\n');
  
  let found = 0;
  
  for (const bank of missingBanks) {
    const success = await downloadBankLogo(bank);
    if (success) found++;
  }
  
  // Try some direct URLs for known banks
  const directUrls = [
    { url: 'https://findssnet.io/bank/logo/t-bank.svg', name: 'tbank' },
    { url: 'https://findssnet.io/bank/logo/sovkom.svg', name: 'sovcombank' },
    { url: 'https://findssnet.io/bank/logo/home-credit.svg', name: 'homecredit' },
    { url: 'https://findssnet.io/bank/logo/russkiy-standart.svg', name: 'russian-standard' },
    { url: 'https://findssnet.io/bank/logo/bank-trust.svg', name: 'trust' },
    { url: 'https://findssnet.io/bank/logo/bank-rossiya.svg', name: 'rossiya' },
    { url: 'https://findssnet.io/bank/logo/center-invest.svg', name: 'centrinvest' },
    { url: 'https://findssnet.io/bank/logo/modul.svg', name: 'modulbank' },
    { url: 'https://findssnet.io/bank/logo/qiwi-bank.svg', name: 'qiwi' },
    { url: 'https://findssnet.io/bank/logo/rencredit.svg', name: 'renaissance' },
    { url: 'https://findssnet.io/bank/logo/citi.svg', name: 'citibank' },
    { url: 'https://findssnet.io/bank/logo/ingbank.svg', name: 'ing' }
  ];
  
  console.log('\n🔍 Trying direct URLs...');
  
  for (const item of directUrls) {
    const result = await downloadFileWithExt(item.url, item.name);
    if (result.success && !result.skipped) {
      found++;
    }
  }
  
  console.log(`\n✨ Search complete!`);
  console.log(`✅ Found ${found} additional logos`);
  
  // Final count
  const allFiles = fs.readdirSync(logosDir);
  const svgLogos = allFiles.filter(f => f.endsWith('.svg'));
  const pngLogos = allFiles.filter(f => f.endsWith('.png'));
  
  console.log(`\n📊 Total logos:`);
  console.log(`   SVG: ${svgLogos.length}`);
  console.log(`   PNG: ${pngLogos.length}`);
  console.log(`   Total: ${allFiles.length}`);
  
  // Clean up duplicate sberbank file
  const sberbankDupe = path.join(logosDir, 'sberbank-sberbank.svg');
  if (fs.existsSync(sberbankDupe)) {
    fs.unlinkSync(sberbankDupe);
    console.log('\n🧹 Cleaned up duplicate sberbank file');
  }
  
  console.log('\n📋 Available bank logos:');
  const uniqueLogos = [...new Set(allFiles.map(f => f.replace(/\.(svg|png)$/, '')))];
  uniqueLogos.sort().forEach(logo => console.log(`   - ${logo}`));
}

// Run the download
downloadAdditionalLogos().catch(console.error);