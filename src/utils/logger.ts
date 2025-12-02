/* Simple logger wrapper to reduce noisy console.* outputs
   - debug/info are shown only in dev mode
   - warn/error are always visible (but could be filtered)
*/
// React Native exposes __DEV__; fallback to false to avoid referencing 'process' in RN TypeScript
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

export const logger = {
  debug: (...args: any[]) => {
    if (isDev) {
      // Use console.debug to allow dev tools to filter it separately
      console.debug(...args);
    }
  },
  info: (...args: any[]) => {
    if (isDev) console.info(...args);
  },
  warn: (...args: any[]) => {
    // show warnings always; can be silenced in production
    console.warn(...args);
  },
  error: (...args: any[]) => {
    console.error(...args);
  },
};

export default logger;
