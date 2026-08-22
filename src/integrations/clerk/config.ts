/**
 * Clerk publishable keys are safe in client code by design — the secret key
 * lives only on the Nest API.
 */
export const CLERK_PUBLISHABLE_KEY =
  import.meta.env["VITE_CLERK_PUBLISHABLE_KEY"] ??
  "pk_test_b25lLXRvcnRvaXNlLTgzLmNsZXJrLmFjY291bnRzLmRldiQ";
