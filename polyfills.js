import { Buffer } from 'buffer';

// Stellar's XDR encoder needs Buffer before the router loads any screens.
if (typeof globalThis.Buffer === 'undefined') globalThis.Buffer = Buffer;
