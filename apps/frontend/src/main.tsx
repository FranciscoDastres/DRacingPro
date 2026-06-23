import { createRoot } from 'react-dom/client';

import { App } from './app/App';
import './styles/index.css';

const root = document.querySelector('#root');

if (!root) {
  throw new Error('Root element was not found');
}

createRoot(root).render(<App />);
