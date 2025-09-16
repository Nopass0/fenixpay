import { calculateAdjustedRate, floorDown2 } from '../src/utils/freezing'

console.log('=== TESTING RATE CALCULATION WITH KKK ===\n')

// Тестовые случаи
const testCases = [
  { merchantRate: 97.1, kkkPercent: 0.5, expected: 96.61 },
  { merchantRate: 95, kkkPercent: 8, expected: 87.4 },
  { merchantRate: 100, kkkPercent: 5, expected: 95 },
  { merchantRate: 92.57, kkkPercent: 3.5, expected: 89.32 },
  { merchantRate: 101.99, kkkPercent: 2.75, expected: 99.18 },
]

console.log('Format: Merchant Rate - KKK% = Adjusted Rate')
console.log('------------------------------------------------')

for (const test of testCases) {
  const adjusted = calculateAdjustedRate(test.merchantRate, test.kkkPercent)
  const manual = floorDown2(test.merchantRate * (1 - test.kkkPercent / 100))
  
  console.log(`${test.merchantRate} - ${test.kkkPercent}% = ${adjusted}`)
  console.log(`  Expected: ${test.expected}`)
  console.log(`  Manual calc: ${manual}`)
  console.log(`  Match: ${adjusted === test.expected ? '✓' : '✗'}`)
  console.log()
}

// Дополнительные примеры
console.log('\n=== ADDITIONAL EXAMPLES ===\n')

const additionalRates = [90, 95.5, 98.76, 102.34, 110.99]
const kkkValues = [1, 2.5, 5, 7.5, 10]

for (const rate of additionalRates) {
  console.log(`\nMerchant rate: ${rate}`)
  for (const kkk of kkkValues) {
    const adjusted = calculateAdjustedRate(rate, kkk)
    console.log(`  KKK ${kkk}%: ${adjusted}`)
  }
}