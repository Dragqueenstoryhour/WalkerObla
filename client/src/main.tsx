import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handling to prevent unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  // Handle auth-related errors gracefully
  if (event.reason?.name === 'AuthRetryableFetchError' || 
      event.reason?.status === 0 || 
      event.reason?.status === 401) {
    console.debug('Auth error handled:', event.reason?.status || event.reason?.name);
    event.preventDefault(); // Prevent error from being logged as unhandled
    return;
  }
  
  // Log other unexpected errors but prevent crashes
  console.error('Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

// Global error handler for other errors
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
});

createRoot(document.getElementById("root")!).render(
  <App />
);
