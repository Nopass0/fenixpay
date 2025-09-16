// Fix for ResizeObserver loop errors
if (typeof window !== 'undefined') {
  const errorHandler = (e: ErrorEvent) => {
    if (e.message === 'ResizeObserver loop completed with undelivered notifications.') {
      const resizeObserverErrDiv = document.getElementById('webpack-dev-server-client-overlay-div');
      const resizeObserverErr = document.getElementById('webpack-dev-server-client-overlay');
      if (resizeObserverErr) {
        resizeObserverErr.setAttribute('style', 'display: none');
      }
      if (resizeObserverErrDiv) {
        resizeObserverErrDiv.setAttribute('style', 'display: none');
      }
      return true;
    }
  };
  
  window.addEventListener('error', errorHandler);
  
  // Also suppress the error in console
  const originalError = console.error;
  console.error = (...args) => {
    if (args[0]?.includes?.('ResizeObserver loop completed with undelivered notifications')) {
      return;
    }
    originalError.apply(console, args);
  };
}