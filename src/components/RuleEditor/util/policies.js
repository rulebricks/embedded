export const typedStrategyOptions = {
  string: {
    "Do Nothing": {
      description: "Does nothing, returns the first value found",
      example: "A + B → A",
      value: "(a, b) => a",
      function: (a, _b) => a
    },
    Replace: {
      description: "Replaces the first value found with the second value",
      example: "A + B → B",
      value: "(a, b) => b",
      function: (_a, b) => b
    },
    Append: {
      description: "Appends the second value to the first value",
      example: "A + B → AB",
      value: "(a, b) => a + b",
      function: (a, b) => a + b
    },
    Prepend: {
      description: "Prepends the first value to the second value",
      example: "A + B → BA",
      value: "(a, b) => b + a",
      function: (a, b) => b + a
    }
  },
  number: {
    "Do Nothing": {
      description: "Does nothing, returns the first value found",
      example: "1 + 2 → 1",
      value: "(a, b) => a",
      function: (a, _b) => a
    },
    Replace: {
      description: "Replaces the first value found with the second value",
      example: "1 + 2 → 2",
      value: "(a, b) => b",
      function: (_a, b) => b
    },
    Add: {
      description: "Adds the first value to the second value",
      example: "1 + 2 → 3",
      value: "(a, b) => a + b",
      function: (a, b) => a + b
    },
    Subtract: {
      description: "Subtracts the second value from the first value",
      example: "1 + 2 → -1",
      value: "(a, b) => a - b",
      function: (a, b) => a - b
    },
    Multiply: {
      description: "Multiplies the first value by the second value",
      example: "1 + 2 → 2",
      value: "(a, b) => a * b",
      function: (a, b) => a * b
    },
    Divide: {
      description: "Divides the first value by the second value",
      example: "1 + 2 → 0.5",
      value: "(a, b) => a / b",
      function: (a, b) => a / b
    }
  },
  boolean: {
    "Do Nothing": {
      description: "Does nothing, returns the first value found",
      example: "true + false → true",
      value: "(a, b) => a",
      function: (a, _b) => a
    },
    Replace: {
      description: "Replaces the first value found with the second value",
      example: "true + false → false",
      value: "(a, b) => b",
      function: (_a, b) => b
    },
    OR: {
      description: "Executes OR on the first and second values",
      example: "true + false → true",
      value: "(a, b) => a || b",
      function: (a, b) => a || b
    },
    AND: {
      description: "Executes AND on the first and second values",
      example: "true + false → false",
      value: "(a, b) => a && b",
      function: (a, b) => a && b
    }
  },
  list: {
    "Do Nothing": {
      description: "Does nothing, returns the first value found",
      example: "[1,2] + [5,6] → [1,2]",
      value: "(a, b) => a",
      function: (a, _b) => a
    },
    Replace: {
      description: "Replaces the first value found with the second value",
      example: "[1,2] + [5,6] → [5,6]",
      value: "(a, b) => b",
      function: (_a, b) => b
    },
    Append: {
      description: "Appends the second value to the first value",
      example: "[1,2] + [5,6] → [1,2,5,6]",
      value: "(a, b) => a.concat(b)",
      function: (a, b) => a.concat(b)
    },
    Prepend: {
      description: "Prepends the first value to the second value",
      example: "[1,2] + [5,6] → [5,6,1,2]",
      value: "(a, b) => b.concat(a)",
      function: (a, b) => b.concat(a)
    },
    Subset: {
      description: "Returns the intersection of the first and second values",
      example: "[1,2] + [2,3] → [2]",
      value: "(a, b) => a.filter((v) => b.includes(v))",
      function: (a, b) => a.filter((v) => b.includes(v))
    }
  },
  date: {
    "Do Nothing": {
      description: "Does nothing, returns the first value found",
      example: "A + B → A",
      value: "(a, b) => a",
      function: (a, _b) => a
    },
    Replace: {
      description: "Replaces the first value found with the second value",
      example: "A + B → B",
      value: "(a, b) => b",
      function: (_a, b) => b
    }
  },
  function: {
    "Do Nothing": {
      description: "Does nothing, returns the first value found",
      example: "A + B → A",
      value: "(a, b) => a",
      function: (a, _b) => a
    },
    Custom: {
      description: "Executes a custom reducer function to aggregate values",
      example: "f(A, B) → C",
      value: "(a, b) => { return a; }",
      function: null
    }
  }
}
