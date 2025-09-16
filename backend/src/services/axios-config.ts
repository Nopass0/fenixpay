import axios from 'axios';

// Set default timeout for all axios requests to 10 seconds
axios.defaults.timeout = 10000;

// Create axios instance with custom config
export const axiosInstance = axios.create({
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to log timeouts
axiosInstance.interceptors.request.use(
  (config) => {
    console.log(`[Axios] Request to ${config.url} with timeout: ${config.timeout}ms`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      console.error(`[Axios] Request timed out: ${error.config.url}`);
      console.error(`[Axios] Timeout was set to: ${error.config.timeout}ms`);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;