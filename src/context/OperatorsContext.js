import * as React from "react";

const OperatorsContext = React.createContext(null);

/**
 * Default operators URL for the Rulebricks platform API
 */
export const DEFAULT_OPERATORS_URL =
  "https://rulebricks.com/api/v1/platform/operators";

/**
 * Empty operators structure for initial state
 */
const EMPTY_OPERATORS = {};

/**
 * Provider component that fetches operators from a remote API
 * and provides them to the component tree via context.
 * Does not render children until operators are loaded to prevent undefined errors.
 */
export function OperatorsProvider({
  children,
  operatorsUrl = DEFAULT_OPERATORS_URL,
  // Allow passing custom operators directly (useful for testing)
  customOperators = null,
  // Optional loading component to show while fetching
  loadingComponent = null,
  // Optional error component to show on fetch failure
  errorComponent = null,
}) {
  const [operators, setOperators] = React.useState(EMPTY_OPERATORS);
  const [loading, setLoading] = React.useState(!customOperators);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    // If custom operators are provided, use them directly
    if (customOperators) {
      setOperators(customOperators);
      setLoading(false);
      return;
    }

    // Skip fetch if no URL provided
    if (!operatorsUrl) {
      setLoading(false);
      return;
    }

    const fetchOperators = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(operatorsUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch operators: ${response.status}`);
        }

        const data = await response.json();
        setOperators(data);
      } catch (err) {
        console.error("Failed to fetch operators:", err.message);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOperators();
  }, [operatorsUrl, customOperators]);

  const value = React.useMemo(
    () => ({
      operators,
      loading,
      error,
      // Expose a way to get operators for a specific type
      getTypeOperators: (type) => operators[type] || null,
    }),
    [operators, loading, error]
  );

  // Don't render children until operators are loaded
  if (loading) {
    return loadingComponent;
  }

  // Show error state if fetch failed
  if (error && errorComponent) {
    return errorComponent;
  }

  return (
    <OperatorsContext.Provider value={value}>
      {children}
    </OperatorsContext.Provider>
  );
}

/**
 * Hook to access operators from context
 */
export function useOperators() {
  const context = React.useContext(OperatorsContext);
  if (!context) {
    // Return empty operators if used outside provider
    return {
      operators: EMPTY_OPERATORS,
      loading: true,
      error: null,
      getTypeOperators: () => null,
    };
  }
  return context;
}

export default OperatorsContext;
