/* eslint-disable */
let storageInstance: any = null;

if (typeof window === "undefined") {
  try {
    // Use dynamic evaluation to prevent client webpack bundle from attempting to resolve node built-ins
    const reqFn = typeof __non_webpack_require__ !== "undefined" ? __non_webpack_require__ : eval("require");
    const asyncHooks = reqFn("async_hooks");
    storageInstance = new asyncHooks.AsyncLocalStorage();
  } catch {
    // Non-blocking fallback
  }
}

export const requestStorage = storageInstance;

export function getRequest(): Request | undefined {
  return requestStorage && typeof requestStorage.getStore === "function"
    ? requestStorage.getStore()
    : undefined;
}
