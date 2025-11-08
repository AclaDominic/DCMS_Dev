import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import api from "../api/api";
import { useAuth } from "../hooks/useAuth";

const PolicyConsentContext = createContext({
  loading: false,
  accepting: false,
  error: null,
  policy: null,
  needsAcceptance: false,
  acceptedPolicyId: null,
  acceptedAt: null,
  hasDismissed: false,
  shouldShowModal: false,
  refresh: () => {},
  accept: async () => {},
  dismissModal: () => {},
  reopenModal: () => {},
});

export function PolicyConsentProvider({ children }) {
  const { user, authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState(null);
  const [needsAcceptance, setNeedsAcceptance] = useState(false);
  const [policy, setPolicy] = useState(null);
  const [acceptedPolicyId, setAcceptedPolicyId] = useState(null);
  const [acceptedAt, setAcceptedAt] = useState(null);
  const [hasDismissed, setHasDismissed] = useState(false);

  const lastPolicyIdRef = useRef(null);

  const resetState = useCallback(() => {
    setNeedsAcceptance(false);
    setPolicy(null);
    setAcceptedPolicyId(null);
    setAcceptedAt(null);
    setHasDismissed(false);
    setError(null);
    lastPolicyIdRef.current = null;
  }, []);

  const fetchConsent = useCallback(async () => {
    if (authLoading) {
      return;
    }

    if (!user || user?.role !== "patient") {
      resetState();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data } = await api.get("/api/policy/consent");

      const activePolicy = data?.active_policy ?? null;
      const activePolicyId = activePolicy?.id ?? null;

      if (lastPolicyIdRef.current !== activePolicyId) {
        setHasDismissed(false);
        lastPolicyIdRef.current = activePolicyId;
      }

      setPolicy(activePolicy);
      setNeedsAcceptance(Boolean(data?.needs_acceptance));
      setAcceptedPolicyId(data?.accepted_policy_id ?? null);
      setAcceptedAt(data?.accepted_at ?? null);
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to load policy consent status.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [authLoading, resetState, user]);

  useEffect(() => {
    fetchConsent();
  }, [fetchConsent]);

  const accept = useCallback(async () => {
    if (!user || user?.role !== "patient") {
      return;
    }

    setAccepting(true);
    setError(null);

    try {
      await api.post("/api/policy/consent/accept");
      setHasDismissed(false);
      await fetchConsent();
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to accept the updated policy. Please try again.";
      setError(message);
    } finally {
      setAccepting(false);
    }
  }, [fetchConsent, user]);

  const dismissModal = useCallback(() => {
    setHasDismissed(true);
  }, []);

  const reopenModal = useCallback(() => {
    setHasDismissed(false);
  }, []);

  const contextValue = useMemo(
    () => ({
      loading,
      accepting,
      error,
      policy,
      needsAcceptance,
      acceptedPolicyId,
      acceptedAt,
      hasDismissed,
      shouldShowModal:
        Boolean(user?.role === "patient" && needsAcceptance && !hasDismissed),
      refresh: fetchConsent,
      accept,
      dismissModal,
      reopenModal,
    }),
    [
      accept,
      acceptedAt,
      acceptedPolicyId,
      accepting,
      dismissModal,
      fetchConsent,
      hasDismissed,
      loading,
      needsAcceptance,
      policy,
      error,
      reopenModal,
      user?.role,
    ]
  );

  return (
    <PolicyConsentContext.Provider value={contextValue}>
      {children}
    </PolicyConsentContext.Provider>
  );
}

export function usePolicyConsent() {
  return useContext(PolicyConsentContext);
}


