const message = "Зачисление 5000 ₽ на счет *5678";
const regex = /(Пополнение|Перевод|Поступление|Зачисление)\s+([\d\s]+[.,]?\d{0,2})\s*₽/i;

console.log("Message:", message);
console.log("Regex:", regex);

const match = regex.exec(message);
if (match) {
  console.log("Match found!");
  console.log("Full match:", match[0]);
  console.log("Transaction type:", match[1]);
  console.log("Amount:", match[2]);
} else {
  console.log("No match found");
  
  // Try simpler regex
  const simpleRegex = /(\d+)\s*₽/;
  const simpleMatch = simpleRegex.exec(message);
  if (simpleMatch) {
    console.log("Simple match found:", simpleMatch[0]);
    console.log("Amount:", simpleMatch[1]);
  }
}