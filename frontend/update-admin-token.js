// Скрипт для обновления админского токена в localStorage
// Запустите этот скрипт в консоли браузера на странице http://localhost:3001

const correctToken = '3d3b2e3efa297cae2bc6b19f3f8448ed2b2c7fd43af823a2a3a0585edfbb67d1';

// Получаем текущее состояние из localStorage
const adminAuth = localStorage.getItem('admin-auth');
if (adminAuth) {
  const authData = JSON.parse(adminAuth);
  console.log('Текущий токен:', authData.state.token);
  
  // Обновляем токен
  authData.state.token = correctToken;
  localStorage.setItem('admin-auth', JSON.stringify(authData));
  
  console.log('Токен обновлен на:', correctToken);
  console.log('Перезагрузите страницу для применения изменений');
} else {
  console.log('admin-auth не найден в localStorage');
  console.log('Попробуйте залогиниться заново с токеном:', correctToken);
}