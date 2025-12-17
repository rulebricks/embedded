import * as React from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import RuleEditorTable from "./components/RuleEditor/RuleEditorTable";
import LoadingSpinner from "./components/ui/LoadingSpinner";
import ErrorDisplay from "./components/ui/ErrorDisplay";
import { applyBranding } from "./utils/branding";
import {
  OperatorsProvider,
  DEFAULT_OPERATORS_URL,
} from "./context/OperatorsContext";

import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

const Rule = React.forwardRef(function Rule(
  {
    embedToken,
    apiBaseUrl,
    height = "600px",
    showFooter = true,
    showControls = true,
    showRowSettings = false,
    onPublish,
    onError,
    // Dynamic operators URL
    operatorsUrl = DEFAULT_OPERATORS_URL,
    // Configurable column group labels
    requestLabel = null,
    responseLabel = null,
    // Support forwardedRef for next/dynamic compatibility
    forwardedRef = null,
  },
  ref
) {
  // Use forwardedRef if provided (for next/dynamic), otherwise use regular ref
  const effectiveRef = forwardedRef || ref;

  // Normalize height to a valid CSS value
  const normalizedHeight = typeof height === "number" ? `${height}px` : height;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [ruleData, setRuleData] = React.useState(null);
  const [globalValues, setGlobalValues] = React.useState([]);
  const [embedUser, setEmbedUser] = React.useState(null);
  const [operators, setOperators] = React.useState(null);
  const [brandingData, setBrandingData] = React.useState(null);
  const [brandingReady, setBrandingReady] = React.useState(false);
  const [permissions, setPermissions] = React.useState({
    canEdit: false,
    canPublish: false,
    canViewSchema: false,
  });
  // Test state for cell highlighting
  const [testState, setTestState] = React.useState(null);
  const [testLoading, setTestLoading] = React.useState(false);

  // Ref for the embed container to apply branding after mount
  const containerRef = React.useRef(null);

  const effectiveBaseUrl =
    apiBaseUrl || (typeof window !== "undefined" ? window.location.origin : "");

  // Fetch all data in a single loading phase (rule data, branding, operators)
  React.useEffect(() => {
    const fetchAllData = async () => {
      if (!embedToken) {
        setError("No embed token provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch rule data, branding, and operators in parallel
        const [verifyResponse, brandingResponse, operatorsResponse] =
          await Promise.all([
            fetch(`${effectiveBaseUrl}/api/embed/verify`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Embed-Token": embedToken,
              },
              body: JSON.stringify({ token: embedToken }),
            }),
            fetch(`${effectiveBaseUrl}/api/embed/branding`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Embed-Token": embedToken,
              },
              body: JSON.stringify({ token: embedToken }),
            }).catch(() => null),
            fetch(operatorsUrl, {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            }).catch(() => null),
          ]);

        // Process verify response
        if (!verifyResponse.ok) {
          const errorData = await verifyResponse.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${verifyResponse.status}`);
        }

        const data = await verifyResponse.json();
        setRuleData(data.rule);
        setPermissions(data.permissions || {});
        setGlobalValues(data.globalValues || []);
        setEmbedUser(data.user || { name: "Embed User", email: null });

        // Process branding response
        if (brandingResponse?.ok) {
          const branding = await brandingResponse.json();
          if (branding.branding) {
            setBrandingData(branding.branding);
          }
        }

        // Process operators response
        if (operatorsResponse?.ok) {
          const ops = await operatorsResponse.json();
          setOperators(ops);
        } else {
          throw new Error("Failed to load operators");
        }
      } catch (err) {
        console.error("Embed initialization error:", err);
        setError(err.message);
        onError?.({ error: err });
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [embedToken, effectiveBaseUrl, operatorsUrl, onError]);

  // Apply branding after the container is mounted, then mark as ready
  React.useEffect(() => {
    const applyBrandingAndMarkReady = async () => {
      // Wait for container to be mounted and data to be loaded
      if (!containerRef.current || loading || error || !ruleData) {
        return;
      }

      if (brandingData) {
        await applyBranding(brandingData);
      }
      setBrandingReady(true);
    };
    applyBrandingAndMarkReady();
  }, [brandingData, loading, error, ruleData]);

  /**
   * Test the current rule against a payload
   * Calls the API endpoint to evaluate the rule and returns test results
   * Also updates the testState to highlight cells
   * @param {Object} payload - The request payload to test against
   * @returns {Promise<Object>} Test results with response, conditions, and successIdxs
   */
  const testRule = React.useCallback(
    async (payload) => {
      if (!embedToken || !ruleData) {
        throw new Error("Cannot test: embed not initialized");
      }

      setTestLoading(true);
      try {
        const response = await fetch(`${effectiveBaseUrl}/api/embed/test`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Embed-Token": embedToken,
          },
          body: JSON.stringify({ payload }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Test failed: HTTP ${response.status}`
          );
        }

        const result = await response.json();

        // Update test state for cell highlighting
        setTestState(result);

        return result;
      } catch (err) {
        console.error("Test error:", err);
        throw err;
      } finally {
        setTestLoading(false);
      }
    },
    [embedToken, effectiveBaseUrl, ruleData]
  );

  /**
   * Clear test results and remove cell highlighting
   */
  const clearTestResults = React.useCallback(() => {
    setTestState(null);
  }, []);

  /**
   * Get the current rule data
   */
  const getRule = React.useCallback(() => {
    return ruleData;
  }, [ruleData]);

  // Expose methods via ref (supports both regular ref and forwardedRef for next/dynamic)
  React.useImperativeHandle(
    effectiveRef,
    () => ({
      testRule,
      clearTestResults,
      getRule,
      isTestLoading: () => testLoading,
    }),
    [testRule, clearTestResults, getRule, testLoading]
  );

  const handleRuleChange = (updates) => {
    // Update internal state
    setRuleData((prev) => ({ ...prev, ...updates }));
    // Clear test results when rule changes
    setTestState(null);
  };

  // Determine what to show inside the container
  const showLoading = loading || !brandingReady;
  const showError = !loading && error;
  const showNoData = !loading && !error && !ruleData;
  const showContent = !loading && !error && ruleData && brandingReady;

  const effectiveEditMode = permissions.canEdit ? "full" : "none";
  const canPublish = effectiveEditMode !== "none" && permissions.canPublish;
  const lockedSchema = !permissions.canViewSchema;

  // Always render within container to maintain single LoadingSpinner instance
  return (
    <QueryClientProvider client={queryClient}>
      <OperatorsProvider customOperators={operators}>
        <div
          ref={containerRef}
          style={{
            height: normalizedHeight,
            maxHeight: normalizedHeight,
            overflow: "hidden",
          }}
          className="relative rounded-lg flex flex-col rulebricks-embed"
          data-embed-container="true"
        >
          {/* Loading state */}
          {showLoading && <LoadingSpinner height={normalizedHeight} />}

          {/* Error state */}
          {showError && (
            <ErrorDisplay
              height={normalizedHeight}
              title="Error Loading Table"
              message={error}
            />
          )}

          {/* No data state */}
          {showNoData && (
            <div
              style={{ height: normalizedHeight }}
              className="flex items-center justify-center bg-gray-50 rounded-lg"
            >
              <p className="font-sans text-gray-500 h-full flex items-center justify-center text-center">
                No rule data available
              </p>
            </div>
          )}

          {/* Main content - only render when ready */}
          {showContent && (
            <div
              className="font-sans flex-1 min-h-0 overflow-hidden"
              style={{ height: "100%" }}
            >
              <RuleEditorTable
                ruleOverride={ruleData}
                globalValuesOverride={globalValues}
                editMode={effectiveEditMode}
                canPublish={canPublish}
                lockedSchema={lockedSchema}
                embedToken={embedToken}
                apiBaseUrl={effectiveBaseUrl}
                ruleId={ruleData?.id}
                embedUser={embedUser}
                showFooter={showFooter}
                showControls={showControls}
                showRowSettings={showRowSettings}
                onRuleChange={handleRuleChange}
                onPublish={onPublish}
                requestLabel={requestLabel}
                responseLabel={responseLabel}
                testStateProp={testState}
                setTestStateProp={setTestState}
              />
            </div>
          )}
        </div>
      </OperatorsProvider>
    </QueryClientProvider>
  );
});

export default Rule;
