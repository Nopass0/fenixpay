const https = require('https');
const fs = require('fs');
const path = require('path');

// Banks to download logos for
const banks = [
  'sberbank', 'sber', 'tinkoff', 'tbank', 'vtb', 'alfabank', 'alpha-bank',
  'raiffeisen', 'gazprombank', 'rosbank', 'otkritie', 'open', 'psb',
  'pochtabank', 'sovcombank', 'mkb', 'uralsib', 'unicredit', 'rshb',
  'homecredit', 'russian-standard', 'bspb', 'avangard', 'akbars',
  'absolut', 'zenit', 'vozrozhdenie', 'trust', 'rnkb', 'rossiya',
  'centrinvest', 'modulbank', 'tochka', 'expobank', 'qiwi', 'rncb'
];

// Most common filename patterns (prioritized)
const filePatterns = [
  '{bank}.svg',
  '{bank}-logo.svg',
  '{bank}_logo.svg',
  'logo-{bank}.svg',
  '{bank}-icon.svg',
  '{bank}logo.svg',
  '{bank}-bank.svg',
  '{bank}_bank.svg',
  '{bank}-512.svg',
  '{bank}-256.svg',
  '{bank}-128.svg',
  '{bank}-64.svg',
  '{bank}-color.svg',
  '{bank}-dark.svg',
  '{bank}-light.svg'
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

// Process banks in batches
async function processBankBatch(bankBatch) {
  const promises = [];
  
  for (const bank of bankBatch) {
    const bankPromise = (async () => {
      console.log(`🏦 Checking ${bank}...`);
      
      for (const pattern of filePatterns) {
        const filename = pattern.replace('{bank}', bank);
        const url = baseUrl + filename;
        const filepath = path.join(logosDir, `${bank}.svg`);
        
        // Skip if already downloaded
        if (fs.existsSync(filepath)) {
          console.log(`⏭️  ${bank} already exists`);
          return true;
        }
        
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
      
      console.log(`❌ No logo found for ${bank}`);
      return false;
    })();
    
    promises.push(bankPromise);
  }
  
  return Promise.all(promises);
}

// Main function
async function downloadAllLogos() {
  console.log('🏦 Starting fast bank logo download...\n');
  
  const batchSize = 5; // Process 5 banks at a time
  let totalDownloaded = 0;
  
  for (let i = 0; i < banks.length; i += batchSize) {
    const batch = banks.slice(i, i + batchSize);
    const results = await processBankBatch(batch);
    totalDownloaded += results.filter(r => r).length;
    
    // Small delay between batches
    if (i + batchSize < banks.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`\n✨ Download complete!`);
  console.log(`✅ Successfully downloaded: ${totalDownloaded} logos`);
  console.log(`📁 Saved to: ${logosDir}`);
}

// Run the download
downloadAllLogos().catch(console.error);