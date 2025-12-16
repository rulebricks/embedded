import * as React from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import { Toaster } from "react-hot-toast";
import RuleEditorTable from "./components/RuleEditor/RuleEditorTable";
import { applyBranding } from "./util/branding";
import {
  OperatorsProvider,
  DEFAULT_OPERATORS_URL,
} from "./context/OperatorsContext";

// Import styles so Rollup processes and bundles them
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
    height = 600,
    showFooter = true,
    showControls = true,
    showRowSettings = false,
    onSave,
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
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [ruleData, setRuleData] = React.useState(null);
  const [globalValues, setGlobalValues] = React.useState([]);
  const [embedUser, setEmbedUser] = React.useState(null);
  const [permissions, setPermissions] = React.useState({
    canEdit: false,
    canPublish: false,
    canViewSchema: false,
  });
  // Test state for cell highlighting
  const [testState, setTestState] = React.useState(null);
  const [testLoading, setTestLoading] = React.useState(false);

  const effectiveBaseUrl =
    apiBaseUrl || (typeof window !== "undefined" ? window.location.origin : "");

  React.useEffect(() => {
    const verifyAndFetch = async () => {
      if (!embedToken) {
        setError("No embed token provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${effectiveBaseUrl}/api/embed/verify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Embed-Token": embedToken,
          },
          body: JSON.stringify({ token: embedToken }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        setRuleData(data.rule);
        setPermissions(data.permissions || {});
        setGlobalValues(data.globalValues || []);
        setEmbedUser(data.user || { name: "Embed User", email: null });

        try {
          const brandingResponse = await fetch(
            `${effectiveBaseUrl}/api/embed/branding`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Embed-Token": embedToken,
              },
              body: JSON.stringify({ token: embedToken }),
            }
          );

          if (brandingResponse.ok) {
            const brandingData = await brandingResponse.json();
            if (brandingData.branding) {
              applyBranding(brandingData.branding);
            }
          }
        } catch (brandingError) {
          console.warn("Failed to fetch branding:", brandingError);
        }
      } catch (err) {
        console.error("Embed verification error:", err);
        setError(err.message);
        onError?.({ error: err });
      } finally {
        setLoading(false);
      }
    };

    verifyAndFetch();
  }, [embedToken, effectiveBaseUrl, onError]);

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
    // Notify parent
    onSave?.({ rule: { ...ruleData, ...updates } });
    // Clear test results when rule changes
    setTestState(null);
  };

  if (loading) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center bg-gray-50 rounded-lg"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500">
            Loading decision table...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center bg-red-50 rounded-lg"
      >
        <div className="text-center max-w-md p-6">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            Error Loading Table
          </h3>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!ruleData) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center bg-gray-50 rounded-lg"
      >
        <p className="text-gray-500">No rule data available</p>
      </div>
    );
  }

  const effectiveEditMode = permissions.canEdit ? "full" : "none";
  const canPublish = effectiveEditMode !== "none" && permissions.canPublish;
  const lockedSchema = !permissions.canViewSchema;

  return (
    <QueryClientProvider client={queryClient}>
      <OperatorsProvider
        operatorsUrl={operatorsUrl}
        loadingComponent={
          <div
            style={{ height }}
            className="flex items-center justify-center bg-gray-50 rounded-lg"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-500">
                Loading operators...
              </span>
            </div>
          </div>
        }
        errorComponent={
          <div
            style={{ height }}
            className="flex items-center justify-center bg-red-50 rounded-lg"
          >
            <div className="text-center max-w-md p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                Error Loading Operators
              </h3>
              <p className="text-red-700 text-sm">
                Failed to load operators from the API.
              </p>
            </div>
          </div>
        }
      >
        <Toaster position="top-right" />
        <div
          style={{ height }}
          className="relative overflow-visible rounded-lg flex flex-col rulebricks-embed"
          data-embed-container="true"
        >
          <div className="flex-1 min-h-0 overflow-hidden">
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
              requestLabel={requestLabel}
              responseLabel={responseLabel}
              testStateProp={testState}
              setTestStateProp={setTestState}
            />
          </div>
        </div>
      </OperatorsProvider>
    </QueryClientProvider>
  );
});

export default Rule;
