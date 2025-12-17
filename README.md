# @rulebricks/embedded

Embed Rulebricks decision tables directly in your application.

## Use Cases

- **Customer portals** – Let customers configure their own business rules
- **Partner integrations** – Provide rule editing to external partners
- **Internal tools** – Embed rule management in admin dashboards

## Installation

```bash
npm install @rulebricks/embedded
```

## Quick Start

### 1. Generate a token (server-side)

Using the helper function:

```javascript
import { createEmbedToken } from "@rulebricks/embedded/server";

const { token } = await createEmbedToken({
  apiKey: process.env.RULEBRICKS_API_KEY,
  ruleId: "your-rule-id",
  baseUrl: "https://rulebricks.com", // or your private instance
});
```

Or call the API directly:

```javascript
const response = await fetch("https://rulebricks.com/api/embed/token", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.RULEBRICKS_API_KEY,
  },
  body: JSON.stringify({
    ruleId: "your-rule-id",
    expiresIn: 3600, // seconds
  }),
});

const { token } = await response.json();
```

### 2. Render the component (client-side)

```jsx
import { Rule } from "@rulebricks/embedded";
import "@rulebricks/embedded/styles.css";

function App() {
  return (
    <Rule
      embedToken={token}
      height={600}
      onSave={(e) => console.log("Saved:", e.rule)}
      onError={(e) => console.error(e)}
    />
  );
}
```

## Props

| Prop              | Type       | Default                  | Description                   |
| ----------------- | ---------- | ------------------------ | ----------------------------- |
| `embedToken`      | `string`   | required                 | Token from your backend       |
| `apiBaseUrl`      | `string`   | `window.location.origin` | Rulebricks instance URL       |
| `height`          | `number`   | `600`                    | Container height in pixels    |
| `showFooter`      | `boolean`  | `true`                   | Show bottom status bar        |
| `showControls`    | `boolean`  | `true`                   | Show top navbar               |
| `showRowSettings` | `boolean`  | `false`                  | Show row settings gear icon   |
| `onPublish`       | `function` | –                        | Called when rule is published |
| `onError`         | `function` | –                        | Called on errors              |

## How It Works

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Your App   │────▶│ Your Backend │────▶│  Rulebricks │
│  (Client)   │     │   (Server)   │     │     API     │
└─────────────┘     └──────────────┘     └─────────────┘
       │                   │                    │
       │  1. Request       │  2. Generate       │
       │     token         │     token          │
       │                   │  (with API key)    │
       │◀──────────────────│◀───────────────────│
       │  3. Embed token   │                    │
       │                   │                    │
       │  4. Load Rule     │                    │
       │     component     │                    │
       │─────────────────────────────────────────▶
       │                                        │
       │◀───────────────────────────────────────│
       │  5. Rule data + permissions            │
```

Permissions are derived from the API key user's role in Rulebricks. The token only restricts – never expands – what the user can do.

## License

MIT
