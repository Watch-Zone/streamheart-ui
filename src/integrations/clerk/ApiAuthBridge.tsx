import { useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";
import { registerTokenGetter } from "@/lib/api/http";

/**
 * Hands Clerk's token getter to the plain-function API layer so query fetchers
 * can attach a bearer token without being React hooks themselves.
 */
export function ApiAuthBridge() {
  const { getToken, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    registerTokenGetter(() => getToken());
    return () => registerTokenGetter(null);
  }, [getToken, isLoaded]);

  return null;
}
