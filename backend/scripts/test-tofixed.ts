// Test JavaScript toFixed behavior with 179.97

const value = 179.97;

console.log('Testing toFixed behavior:');
console.log(`Value: ${value}`);
console.log(`toFixed(2): ${value.toFixed(2)}`);
console.log(`Type of toFixed(2): ${typeof value.toFixed(2)}`);

// Test with slightly different values
console.log('\nTesting edge cases:');
const values = [179.96, 179.965, 179.969, 179.97, 179.974, 179.975, 179.98];
values.forEach(v => {
  console.log(`${v} -> toFixed(2) = ${v.toFixed(2)}`);
});

// Test what might be coming from API
console.log('\nTesting API response parsing:');
const jsonValue = JSON.parse('179.97');
console.log(`JSON parsed 179.97: ${jsonValue}`);
console.log(`toFixed(2): ${jsonValue.toFixed(2)}`);

// Test with Decimal-like precision issues
console.log('\nTesting potential precision issues:');
const precisionTest = 179.96999999999997; // This might be what's actually stored
console.log(`Value: ${precisionTest}`);
console.log(`toFixed(2): ${precisionTest.toFixed(2)}`);