export const clearAuthData = () => {
  // Очищаем все данные авторизации из localStorage
  if (typeof window !== 'undefined') {
    localStorage.removeItem('trader-auth')
    localStorage.removeItem('admin-auth')
    console.log('All auth data cleared from localStorage')
  }
}

export const debugAuthState = () => {
  if (typeof window !== 'undefined') {
    const traderAuth = localStorage.getItem('trader-auth')
    const adminAuth = localStorage.getItem('admin-auth')
    
    console.log('=== Auth Debug Info ===')
    console.log('Trader auth:', traderAuth ? JSON.parse(traderAuth) : null)
    console.log('Admin auth:', adminAuth ? JSON.parse(adminAuth) : null)
    console.log('=====================')
  }
}