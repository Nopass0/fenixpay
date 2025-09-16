const https = require('https');
const fs = require('fs');
const path = require('path');

// Banks to download logos for
const banks = [
  'sberbank', 'sber', 'tinkoff', 'tbank', 'vtb', 'alfabank', 'alpha-bank', 'alfa-bank',
  'raiffeisen', 'raiffeisenbank', 'gazprombank', 'gazprom', 'rosbank', 'rossbank',
  'otkritie', 'openbank', 'open', 'psb', 'promsvyazbank', 'pochta', 'pochtabank',
  'sovcombank', 'sovkom', 'mkb', 'moskovskiy-kreditnyy-bank', 'uralsib', 'unicredit',
  'unicreditbank', 'rosselkhozbank', 'rshb', 'citibank', 'citi', 'ingbank', 'ing',
  'home-credit', 'homecredit', 'russian-standard', 'russkiy-standart', 'bank-saint-petersburg',
  'bspb', 'avangard', 'avangardbank', 'ak-bars', 'akbars', 'absolut', 'absolutbank',
  'zenit', 'zenitbank', 'vozrozhdenie', 'vozrozhdeniebank', 'trust', 'trustbank',
  'rnkb', 'rossiya', 'russiabank', 'centrinvest', 'center-invest', 'ugra', 'ugrabank',
  'modulbank', 'modul', 'tochka', 'tochkabank', 'expobank', 'expo', 'qiwi', 'qiwibank',
  'rncb', 'krayinvestbank', 'krayinvest', 'primsotsbank', 'primsots', 'primorye',
  'dalnevostochnyy', 'dvb', 'smp', 'smpbank', 'mosoblbank', 'metallinvestbank',
  'novikombank', 'novikom', 'loko', 'lokobank', 'renaissance', 'renaissancebank'
];

// Different filename patterns to try
const filePatterns = [
  '{bank}.svg',
  '{bank}-logo.svg',
  '{bank}_logo.svg',
  '{bank}logo.svg',
  'logo-{bank}.svg',
  'logo_{bank}.svg',
  'logo{bank}.svg',
  '{bank}-bank.svg',
  '{bank}_bank.svg',
  '{bank}bank.svg',
  '{bank}-icon.svg',
  '{bank}_icon.svg',
  '{bank}icon.svg',
  'icon-{bank}.svg',
  'icon_{bank}.svg',
  'icon{bank}.svg',
  '{bank}-brand.svg',
  '{bank}_brand.svg',
  '{bank}brand.svg',
  '{bank}-512.svg',
  '{bank}_512.svg',
  '{bank}512.svg',
  '{bank}-256.svg',
  '{bank}_256.svg',
  '{bank}256.svg',
  '{bank}-128.svg',
  '{bank}_128.svg',
  '{bank}128.svg',
  '{bank}-64.svg',
  '{bank}_64.svg',
  '{bank}64.svg',
  '{bank}-48.svg',
  '{bank}_48.svg',
  '{bank}48.svg',
  '{bank}-32.svg',
  '{bank}_32.svg',
  '{bank}32.svg',
  '{bank}-sq.svg',
  '{bank}_sq.svg',
  '{bank}sq.svg',
  '{bank}-square.svg',
  '{bank}_square.svg',
  '{bank}square.svg',
  '{bank}-round.svg',
  '{bank}_round.svg',
  '{bank}round.svg',
  '{bank}-circle.svg',
  '{bank}_circle.svg',
  '{bank}circle.svg',
  '{bank}-color.svg',
  '{bank}_color.svg',
  '{bank}color.svg',
  '{bank}-mono.svg',
  '{bank}_mono.svg',
  '{bank}mono.svg',
  '{bank}-white.svg',
  '{bank}_white.svg',
  '{bank}white.svg',
  '{bank}-black.svg',
  '{bank}_black.svg',
  '{bank}black.svg',
  '{bank}-dark.svg',
  '{bank}_dark.svg',
  '{bank}dark.svg',
  '{bank}-light.svg',
  '{bank}_light.svg',
  '{bank}light.svg',
  '{bank}-full.svg',
  '{bank}_full.svg',
  '{bank}full.svg',
  '{bank}-compact.svg',
  '{bank}_compact.svg',
  '{bank}compact.svg',
  '{bank}-mini.svg',
  '{bank}_mini.svg',
  '{bank}mini.svg',
  '{bank}-small.svg',
  '{bank}_small.svg',
  '{bank}small.svg',
  '{bank}-large.svg',
  '{bank}_large.svg',
  '{bank}large.svg',
  '{bank}-xl.svg',
  '{bank}_xl.svg',
  '{bank}xl.svg',
  '{bank}-2x.svg',
  '{bank}_2x.svg',
  '{bank}2x.svg',
  '{bank}-3x.svg',
  '{bank}_3x.svg',
  '{bank}3x.svg',
  '{bank}-ru.svg',
  '{bank}_ru.svg',
  '{bank}ru.svg',
  '{bank}-russia.svg',
  '{bank}_russia.svg',
  '{bank}russia.svg',
  '{bank}-new.svg',
  '{bank}_new.svg',
  '{bank}new.svg',
  '{bank}-2023.svg',
  '{bank}_2023.svg',
  '{bank}2023.svg',
  '{bank}-2024.svg',
  '{bank}_2024.svg',
  '{bank}2024.svg'
];

// Base URL
const baseUrl = 'https://findssnet.io/bank/logo/';

// Create public/bank-logos directory if it doesn't exist
const logosDir = path.join(__dirname, '..', 'public', 'bank-logos');
if (!fs.existsSync(logosDir)) {
  fs.mkdirSync(logosDir, { recursive: true });
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
        fs.unlink(filepath, () => {}); // Delete the file if download failed
        resolve(false);
      }
    }).on('error', (err) => {
      file.close();
      fs.unlink(filepath, () => {}); // Delete the file if download failed
      resolve(false);
    });
  });
}

// Main function to download all logos
async function downloadAllLogos() {
  console.log('🏦 Starting bank logo download...\n');
  
  let totalDownloaded = 0;
  let totalAttempts = 0;
  
  for (const bank of banks) {
    console.log(`\n📥 Trying to download logos for: ${bank}`);
    let bankDownloaded = false;
    
    for (const pattern of filePatterns) {
      const filename = pattern.replace('{bank}', bank);
      const url = baseUrl + filename;
      const filepath = path.join(logosDir, `${bank}-${filename}`);
      
      totalAttempts++;
      
      // Skip if file already exists
      if (fs.existsSync(filepath)) {
        console.log(`⏭️  Skipping (already exists): ${filename}`);
        continue;
      }
      
      const success = await downloadFile(url, filepath);
      
      if (success) {
        totalDownloaded++;
        bankDownloaded = true;
      }
      
      // Add a small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!bankDownloaded) {
      console.log(`❌ No logos found for: ${bank}`);
    }
  }
  
  console.log(`\n✨ Download complete!`);
  console.log(`📊 Total attempts: ${totalAttempts}`);
  console.log(`✅ Successfully downloaded: ${totalDownloaded} logos`);
  console.log(`📁 Saved to: ${logosDir}`);
}

// Run the download
downloadAllLogos().catch(console.error);