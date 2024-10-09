import { redirect } from "next/navigation";

/**
 * Redirects to a specified path with an encoded message as a query parameter.
 * @param {('error' | 'success')} type - The type of message, either 'error' or 'success'.
 * @param {string} path - The path to redirect to.
 * @param {string} message - The message to be encoded and added as a query parameter.
 * @returns {never} This function doesn't return as it triggers a redirect.
 */
export function encodedRedirect(
  type: "error" | "success",
  path: string,
  message: string,
) {
  return redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

export function generateUUID() {
  // Check if we're in a Node.js environment
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    // Node.js environment
    const { randomUUID } = require('crypto');
    return randomUUID();
  } else if (typeof window !== 'undefined' && window.crypto) {
    // Browser environment
    return window.crypto.randomUUID();
  } else {
    throw new Error('Unable to generate UUID: crypto support not found');
  }
}