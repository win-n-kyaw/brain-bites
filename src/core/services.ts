import { Analytics } from './Analytics';
import { AudioService } from './AudioService';
import { SaveService } from './SaveService';

// The shared systems every hub scene and game uses (design doc §4).
export const saves = new SaveService();
export const analytics = new Analytics();
export const audio = new AudioService(() => saves.settings);
