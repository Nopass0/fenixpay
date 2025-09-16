const https = require('https');
const fs = require('fs');
const path = require('path');

// Extended list of banks with variations
const banksExtended = [
  // Missed major banks with variations
  { names: ['alfa', 'alfa-bank', 'alfabank', 'alpha', 'alpha-bank', 'alphabank'], output: 'alfabank' },
  { names: ['tinkoff-bank', 'tcs', 'tcsbank', 'tinkoffbank'], output: 'tinkoff' },
  { names: ['t-bank', 'tbank', 't_bank'], output: 'tbank' },
  { names: ['sberbank-rossii', 'sberbank-russia', 'sbrf', 'sber-bank'], output: 'sberbank' },
  { names: ['pochta', 'pochta-bank', 'pochtabank', 'russian-post-bank'], output: 'pochtabank' },
  { names: ['otkritie', 'otkrytie', 'open', 'openbank', 'otkritie-bank', 'fk-otkritie'], output: 'otkritie' },
  { names: ['sovcom', 'sovkombank', 'sovcombank', 'sovkom-bank'], output: 'sovcombank' },
  { names: ['home-credit', 'homecredit', 'hcf', 'home_credit', 'home-credit-bank'], output: 'homecredit' },
  { names: ['russian-standard', 'russkiy-standart', 'rs', 'rsb', 'russian_standard'], output: 'russian-standard' },
  { names: ['unicredit', 'unicreditbank', 'unicredit-bank', 'unicredit-russia'], output: 'unicredit' },
  { names: ['raiffeisen', 'raiffeisenbank', 'raiffeisen-bank', 'raiff'], output: 'raiffeisen' },
  { names: ['promsvyazbank', 'promsvyaz', 'psb-bank'], output: 'psb' },
  { names: ['rosselkhozbank', 'rshb-bank', 'rosselhozbank'], output: 'rshb' },
  { names: ['trust', 'trustbank', 'trust-bank', 'national-bank-trust'], output: 'trust' },
  { names: ['rossiya', 'russia', 'bank-rossiya', 'bank-russia'], output: 'rossiya' },
  { names: ['vtb24', 'vtb-24', 'vtb_24'], output: 'vtb' },
  { names: ['vozrozhdenie', 'vozrozhdeniye', 'vozrojdenie'], output: 'vozrozhdenie' },
  { names: ['absolut', 'absolutbank', 'absolut-bank', 'absolyut'], output: 'absolut' },
  { names: ['ak-bars', 'akbars', 'ak_bars', 'akbarsbank'], output: 'akbars' },
  { names: ['saint-petersburg', 'spb', 'bank-spb', 'bspb-bank'], output: 'bspb' },
  
  // Additional banks
  { names: ['citibank', 'citi', 'citi-russia', 'citibank-russia'], output: 'citibank' },
  { names: ['ing', 'ingbank', 'ing-bank', 'ing-russia'], output: 'ing' },
  { names: ['deutsche', 'deutschebank', 'deutsche-bank', 'db'], output: 'deutschebank' },
  { names: ['credit-agricole', 'credit_agricole', 'ca', 'credit-agricole-cib'], output: 'credit-agricole' },
  { names: ['societe-generale', 'socgen', 'sg', 'rosbank-societe-generale'], output: 'societe-generale' },
  { names: ['bnp-paribas', 'bnp', 'bnpparibas', 'bnp_paribas'], output: 'bnp-paribas' },
  { names: ['commerzbank', 'commerz', 'commerzbank-eurasija'], output: 'commerzbank' },
  { names: ['nordea', 'nordeabank', 'nordea-bank'], output: 'nordea' },
  { names: ['intesa', 'intesabank', 'intesa-bank'], output: 'intesa' },
  
  // Regional banks
  { names: ['center-invest', 'centrinvest', 'center_invest'], output: 'centrinvest' },
  { names: ['ugra', 'ugrabank', 'jugra', 'jugrabank'], output: 'ugra' },
  { names: ['primsotsbank', 'primsots', 'primsocbank'], output: 'primsotsbank' },
  { names: ['primorye', 'primorie', 'primorskiy'], output: 'primorye' },
  { names: ['dalnevostochnyy', 'dalnevostochny', 'dvb', 'far-eastern-bank'], output: 'dvb' },
  { names: ['mosoblbank', 'mosobl', 'moscow-oblast-bank'], output: 'mosoblbank' },
  { names: ['krayinvestbank', 'krayinvest', 'kray-invest'], output: 'krayinvestbank' },
  
  // Digital banks
  { names: ['tochka', 'tochkabank', 'tochka-bank', 'точка'], output: 'tochka' },
  { names: ['modulbank', 'modul', 'modul-bank'], output: 'modulbank' },
  { names: ['rocketbank', 'rocket', 'rocket-bank'], output: 'rocketbank' },
  { names: ['yandex', 'yandexmoney', 'yoomoney', 'yoo'], output: 'yoomoney' },
  
  // Other banks
  { names: ['smp', 'smpbank', 'smp-bank'], output: 'smpbank' },
  { names: ['novikombank', 'novikom', 'novikom-bank'], output: 'novikombank' },
  { names: ['metallinvestbank', 'metallinvest', 'metallinvest-bank'], output: 'metallinvestbank' },
  { names: ['loko', 'lokobank', 'loko-bank', 'locko'], output: 'lokobank' },
  { names: ['renaissance', 'rencredit', 'renaissance-credit'], output: 'renaissance' },
  { names: ['otp', 'otpbank', 'otp-bank'], output: 'otpbank' },
  { names: ['orient-express', 'orientexpress', 'orient_express'], output: 'orient-express' },
  { names: ['transcapital', 'transcapitalbank', 'tkb'], output: 'transcapital' },
  { names: ['ns-bank', 'nsbank', 'ns_bank', 'national-standard'], output: 'nsbank' },
  { names: ['energotransbank', 'energotrans', 'etb'], output: 'energotransbank' },
  { names: ['fora', 'forabank', 'fora-bank'], output: 'forabank' },
  { names: ['credit-europe', 'crediteurope', 'credit-europe-bank'], output: 'credit-europe' },
  { names: ['zapsibkombank', 'zapsibkom', 'zapsib'], output: 'zapsibkombank' },
  { names: ['levoberezhny', 'levoberezhniy', 'left-bank'], output: 'levoberezhny' },
  { names: ['baltinvestbank', 'baltinvest', 'baltic-investment'], output: 'baltinvestbank' }
];

// Extended filename patterns
const extendedPatterns = [
  '{bank}.svg',
  '{bank}-logo.svg',
  '{bank}_logo.svg',
  '{bank}logo.svg',
  'logo-{bank}.svg',
  'logo_{bank}.svg',
  'logo{bank}.svg',
  '{bank}-icon.svg',
  '{bank}_icon.svg',
  '{bank}icon.svg',
  'icon-{bank}.svg',
  'icon_{bank}.svg',
  '{bank}-bank.svg',
  '{bank}_bank.svg',
  '{bank}bank.svg',
  'bank-{bank}.svg',
  'bank_{bank}.svg',
  '{bank}-brand.svg',
  '{bank}_brand.svg',
  '{bank}-symbol.svg',
  '{bank}_symbol.svg',
  '{bank}-emblem.svg',
  '{bank}_emblem.svg',
  '{bank}-mark.svg',
  '{bank}_mark.svg',
  '{bank}-logotype.svg',
  '{bank}_logotype.svg',
  '{bank}.logo.svg',
  '{bank}.icon.svg',
  'logo.{bank}.svg',
  'icon.{bank}.svg',
  '{bank}-full.svg',
  '{bank}-compact.svg',
  '{bank}-small.svg',
  '{bank}-large.svg',
  '{bank}-main.svg',
  '{bank}-primary.svg'
];

// Base URL
const baseUrl = 'https://findssnet.io/bank/logo/';

// Create public/bank-logos directory if it doesn't exist
const logosDir = path.join(__dirname, '..', 'public', 'bank-logos');
if (!fs.existsSync(logosDir)) {
  fs.mkdirSync(logosDir, { recursive: true });
}

// Function to check if URL exists
function checkUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (response) => {
      resolve(response.statusCode === 200);
    }).on('error', () => {
      resolve(false);
    });
  });
}

// Function to download a file
function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`✅ Downloaded: ${path.basename(filepath)}`);
          resolve(true);
        });
      } else {
        file.close();
        fs.unlink(filepath, () => {});
        resolve(false);
      }
    }).on('error', (err) => {
      file.close();
      fs.unlink(filepath, () => {});
      resolve(false);
    });
  });
}

// Process bank with all name variations
async function processBank(bankObj) {
  const filepath = path.join(logosDir, `${bankObj.output}.svg`);
  
  // Skip if already downloaded
  if (fs.existsSync(filepath)) {
    console.log(`⏭️  ${bankObj.output} already exists`);
    return true;
  }
  
  console.log(`🏦 Checking ${bankObj.output}...`);
  
  // Try each name variation
  for (const bankName of bankObj.names) {
    // Try each pattern
    for (const pattern of extendedPatterns) {
      const filename = pattern.replace('{bank}', bankName);
      const url = baseUrl + filename;
      
      // Check if URL exists
      const exists = await checkUrl(url);
      
      if (exists) {
        // Download the file
        const success = await downloadFile(url, filepath);
        if (success) {
          return true;
        }
      }
    }
  }
  
  console.log(`❌ No logo found for ${bankObj.output}`);
  return false;
}

// Process banks in batches
async function processBankBatch(batch) {
  const promises = batch.map(bank => processBank(bank));
  return Promise.all(promises);
}

// Main function
async function downloadAllLogos() {
  console.log('🏦 Starting comprehensive bank logo download...\n');
  
  const batchSize = 3; // Process 3 banks at a time
  let totalDownloaded = 0;
  
  for (let i = 0; i < banksExtended.length; i += batchSize) {
    const batch = banksExtended.slice(i, i + batchSize);
    const results = await processBankBatch(batch);
    totalDownloaded += results.filter(r => r).length;
    
    // Small delay between batches
    if (i + batchSize < banksExtended.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`\n✨ Download complete!`);
  console.log(`✅ Successfully downloaded: ${totalDownloaded} new logos`);
  console.log(`📁 Saved to: ${logosDir}`);
  
  // List all downloaded logos
  const allLogos = fs.readdirSync(logosDir).filter(f => f.endsWith('.svg'));
  console.log(`\n📊 Total logos in directory: ${allLogos.length}`);
  console.log('\n📋 Available bank logos:');
  allLogos.forEach(logo => console.log(`   - ${logo}`));
}

// Run the download
downloadAllLogos().catch(console.error);