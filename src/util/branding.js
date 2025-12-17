// util/branding.js (embed package)
// Ported from app `src/util/branding.js` so embed behaves identically (colors, radius, Google font loading).

const styleElements = {
  borderRadius: null,
  colors: null,
  googleFont: null,
  customFont: null,
};

let currentBranding = null;

export const applyBranding = async (brandingSettings) => {
  if (!brandingSettings || typeof document === "undefined") return;

  currentBranding = { ...brandingSettings };

  applyBorderRadius(brandingSettings.borderRadius);
  applyColors(brandingSettings.primaryColor, brandingSettings.accentColor);

  if (brandingSettings.customFontUrl) {
    applyCustomFont(
      brandingSettings.customFontUrl,
      brandingSettings.customFontName
    );
  } else if (brandingSettings.font) {
    applyGoogleFont(brandingSettings.font);
  } else {
    resetFonts();
  }

  // Wait for fonts to be fully loaded before returning
  if (brandingSettings.font || brandingSettings.customFontUrl) {
    try {
      await document.fonts.ready;
    } catch {
      // Font loading API not supported or failed, continue anyway
    }
  }
};

export const getBorderRadiusCss = (borderRadius) => {
  let radiusValue = "0.125rem";
  let loadingRadiusValue = "0rem";

  switch (borderRadius) {
    case "none":
      radiusValue = "0px";
      loadingRadiusValue = "0rem";
      break;
    case "default":
      radiusValue = "0.125rem";
      loadingRadiusValue = "0rem";
      break;
    case "large":
      radiusValue = "0.5rem";
      loadingRadiusValue = "2rem";
      break;
    default:
      radiusValue = "0.125rem";
      loadingRadiusValue = "0rem";
  }

  return `
    :root {
      --border-radius: ${radiusValue};
      --loading-radius: ${loadingRadiusValue};
    }
    .rounded-sm { border-radius: var(--border-radius) !important; }
    .rounded-t-sm { border-top-left-radius: var(--border-radius) !important; border-top-right-radius: var(--border-radius) !important; }
    .rounded-b-sm { border-bottom-left-radius: var(--border-radius) !important; border-bottom-right-radius: var(--border-radius) !important; }
    .rounded-l-sm { border-top-left-radius: var(--border-radius) !important; border-bottom-left-radius: var(--border-radius) !important; }
    .rounded-r-sm { border-top-right-radius: var(--border-radius) !important; border-bottom-right-radius: var(--border-radius) !important; }
    .rounded-tr-sm { border-top-right-radius: var(--border-radius) !important; }
    .rounded-md { border-radius: calc(var(--border-radius) * 2) !important; }
    .rounded-t-md { border-top-left-radius: calc(var(--border-radius) * 2) !important; border-top-right-radius: calc(var(--border-radius) * 2) !important; }
    .rounded-b-md { border-bottom-left-radius: calc(var(--border-radius) * 2) !important; border-bottom-right-radius: calc(var(--border-radius) * 2) !important; }
    .rounded-l-md { border-top-left-radius: calc(var(--border-radius) * 2) !important; border-bottom-left-radius: calc(var(--border-radius) * 2) !important; }
    .rounded-r-md { border-top-right-radius: calc(var(--border-radius) * 2) !important; border-bottom-right-radius: calc(var(--border-radius) * 2) !important; }
    .rounded-lg { border-radius: calc(var(--border-radius) * 3) !important; }
    .rounded-t-lg { border-top-left-radius: calc(var(--border-radius) * 3) !important; border-top-right-radius: calc(var(--border-radius) * 3) !important; }
    .rounded-b-lg { border-bottom-left-radius: calc(var(--border-radius) * 3) !important; border-bottom-right-radius: calc(var(--border-radius) * 3) !important; }
    .rounded-l-lg { border-top-left-radius: calc(var(--border-radius) * 3) !important; border-bottom-left-radius: calc(var(--border-radius) * 3) !important; }
    .rounded-r-lg { border-top-right-radius: calc(var(--border-radius) * 3) !important; border-bottom-right-radius: calc(var(--border-radius) * 3) !important; }
  `;
};

const getEmbedRoot = () => {
  if (typeof document === "undefined") return null;
  return document.querySelector('[data-embed-container="true"]');
};

const applyBorderRadius = (borderRadius) => {
  const embedRoot = getEmbedRoot();
  if (!embedRoot) return;

  switch (borderRadius) {
    case "none":
      embedRoot.style.setProperty("--border-radius", "0px");
      embedRoot.style.setProperty("--loading-radius", "0rem");
      embedRoot.style.setProperty("--rb-border-radius", "0px");
      break;
    case "default":
      embedRoot.style.setProperty("--border-radius", "0.125rem");
      embedRoot.style.setProperty("--loading-radius", "0rem");
      embedRoot.style.setProperty("--rb-border-radius", "0.125rem");
      break;
    case "large":
      embedRoot.style.setProperty("--border-radius", "0.5rem");
      embedRoot.style.setProperty("--loading-radius", "2rem");
      embedRoot.style.setProperty("--rb-border-radius", "0.5rem");
      break;
    default:
      embedRoot.style.setProperty("--border-radius", "0.125rem");
      embedRoot.style.setProperty("--loading-radius", "0rem");
      embedRoot.style.setProperty("--rb-border-radius", "0.125rem");
  }

  if (!styleElements.borderRadius) {
    styleElements.borderRadius = createStyleElement("branding-border-radius");
  }
  // Scope overrides to the embed container only (do not affect host page)
  styleElements.borderRadius.innerHTML = getBorderRadiusCss(borderRadius)
    .replaceAll(":root", '[data-embed-container="true"]')
    .replaceAll(".rounded-", '[data-embed-container="true"] .rounded-');
};

export const getColorsCss = (primaryColor, accentColor) => {
  const pColor = primaryColor || "#000000";
  const aColor = accentColor || "#f59e0b";

  return `
    :root {
      --primary-color: ${pColor};
      --accent-color: ${aColor};
    }
    #dialog-background { opacity: 0.5 !important; filter: brightness(0.5); }
    .bg-black { background-color: var(--primary-color) !important; }
    .text-black { color: var(--primary-color) !important; }
    .hover\\:bg-neutral-700:hover { background-color: var(--primary-color) !important; filter: brightness(90%); }
    .bg-amber-600 { background-color: var(--accent-color) !important; }
    .hover\\:bg-amber-700:hover { background-color: var(--accent-color) !important; filter: brightness(90%); }
    button.border-2.border-black { border-color: var(--primary-color) !important; }
  `;
};

const applyColors = (primaryColor, accentColor) => {
  const embedRoot = getEmbedRoot();
  if (!embedRoot) return;

  embedRoot.style.setProperty("--primary-color", primaryColor || "#000000");
  embedRoot.style.setProperty("--accent-color", accentColor || "#f59e0b");
  embedRoot.style.setProperty("--rb-color-primary", primaryColor || "#000000");
  embedRoot.style.setProperty("--rb-color-accent", accentColor || "#f59e0b");

  if (!styleElements.colors) {
    styleElements.colors = createStyleElement("branding-colors");
  }
  // Scope overrides to the embed container only (do not affect host page)
  styleElements.colors.innerHTML = getColorsCss(
    primaryColor,
    accentColor
  ).replaceAll(":root", '[data-embed-container="true"]');
};

export const getGoogleFontUrl = (fontName) => {
  const formattedFontName = fontName.replace(" ", "+");
  return `https://fonts.googleapis.com/css2?family=${formattedFontName}:wght@400;500;600;700&display=swap`;
};

export const getGoogleFontCss = (fontName) => {
  // Apply font-family to all text elements within the embed container
  return `
    [data-embed-container="true"] {
      --scalar-font: "${fontName}", ui-sans-serif, system-ui, -apple-system, sans-serif;
      --rb-font-family: "${fontName}", ui-sans-serif, system-ui, -apple-system, sans-serif;
    }
    [data-embed-container="true"],
    [data-embed-container="true"] .font-sans,
    [data-embed-container="true"] input,
    [data-embed-container="true"] button,
    [data-embed-container="true"] select,
    [data-embed-container="true"] textarea:not(.npm__react-simple-code-editor__textarea) {
      font-family: "${fontName}", ui-sans-serif, system-ui, -apple-system, sans-serif !important;
    }
  `;
};

const applyGoogleFont = (fontName) => {
  if (!fontName) return;
  const embedRoot = getEmbedRoot();
  if (!embedRoot) return;

  // 1) link tag
  if (!styleElements.googleFont) {
    styleElements.googleFont = document.createElement("link");
    styleElements.googleFont.id = "branding-google-font";
    styleElements.googleFont.rel = "stylesheet";
    document.head.appendChild(styleElements.googleFont);
  }
  styleElements.googleFont.href = getGoogleFontUrl(fontName);

  // 2) css that applies it
  if (!styleElements.customFont) {
    styleElements.customFont = createStyleElement("branding-google-font-css");
  }
  styleElements.customFont.innerHTML = getGoogleFontCss(fontName);

  // Make embed CSS pick it up
  embedRoot.style.setProperty(
    "--rb-font-family",
    `"${fontName}", ui-sans-serif, system-ui, -apple-system, sans-serif`
  );
};

const applyCustomFont = (customFontUrl, customFontName) => {
  if (!customFontUrl) return;
  const embedRoot = getEmbedRoot();
  if (!embedRoot) return;

  const fontName = customFontName || "Custom Font";

  // Determine format based on file extension
  let format = "woff2"; // default
  const extension = customFontUrl.split(".").pop().toLowerCase();
  switch (extension) {
    case "woff":
      format = "woff";
      break;
    case "woff2":
      format = "woff2";
      break;
    case "ttf":
      format = "truetype";
      break;
    case "otf":
      format = "opentype";
      break;
  }

  if (!styleElements.customFont) {
    styleElements.customFont = createStyleElement("branding-custom-font");
  }
  styleElements.customFont.innerHTML = `
    @font-face {
      font-family: '${fontName}';
      src: url('${customFontUrl}') format('${format}');
      font-weight: 100 900;
      font-style: normal;
      font-display: swap;
    }
    [data-embed-container="true"] {
      --scalar-font: '${fontName}', ui-sans-serif, system-ui, -apple-system, sans-serif;
      --rb-font-family: '${fontName}', ui-sans-serif, system-ui, -apple-system, sans-serif;
    }
    [data-embed-container="true"],
    [data-embed-container="true"] *,
    [data-embed-container="true"] .font-sans,
    [data-embed-container="true"] input,
    [data-embed-container="true"] button,
    [data-embed-container="true"] select,
    [data-embed-container="true"] textarea:not(.npm__react-simple-code-editor__textarea) {
      font-family: '${fontName}', ui-sans-serif, system-ui, -apple-system, sans-serif !important;
    }
  `;

  embedRoot.style.setProperty(
    "--rb-font-family",
    `'${fontName}', ui-sans-serif, system-ui, -apple-system, sans-serif`
  );
};

const resetFonts = () => {
  if (styleElements.googleFont?.parentNode)
    styleElements.googleFont.parentNode.removeChild(styleElements.googleFont);
  styleElements.googleFont = null;
  if (styleElements.customFont) styleElements.customFont.innerHTML = "";
};

const createStyleElement = (id) => {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("style");
    el.id = id;
    document.head.appendChild(el);
  }
  return el;
};
