import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorProvider } from './context/ErrorContext'

createRoot(document.getElementById('root')!).render(
  <ErrorProvider>
    <App />
  </ErrorProvider>
)
