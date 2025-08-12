/// <reference types="vite/client" />


// Global declarations for Tavern-Helper and lodash
declare const triggerSlash: (command: string) => Promise<void>;
declare const _: any; // lodash