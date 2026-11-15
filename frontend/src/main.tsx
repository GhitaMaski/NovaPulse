import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { useMissionStore } from './stores/useMissionStore';
import './index.css';

void useMissionStore.getState().connectMission();
createRoot(document.getElementById('root')!).render(<App />);
