// Scan targets for A11y Watchdog.
// Surfaces: "marketing" (trilogycare.com.au), "pricing" (staging deploy), "component-library" (Storybook, added dynamically).

export const WEB_TARGETS = [
  // --- Trilogy Care marketing site (apex serves 200; www 301s to apex) ---
  { surface: "marketing", name: "Home", url: "https://trilogycare.com.au/" },
  { surface: "marketing", name: "About Us", url: "https://trilogycare.com.au/about-us" },
  { surface: "marketing", name: "Our Story", url: "https://trilogycare.com.au/our-story" },
  { surface: "marketing", name: "Pricing", url: "https://trilogycare.com.au/pricing" },
  { surface: "marketing", name: "Self Managed", url: "https://trilogycare.com.au/services/self-managed" },
  { surface: "marketing", name: "Fully Coordinated", url: "https://trilogycare.com.au/services/fully-coordinated" },
  { surface: "marketing", name: "Support at Home", url: "https://trilogycare.com.au/support-at-home" },
  { surface: "marketing", name: "Knowledge Hub", url: "https://trilogycare.com.au/knowledge-hub" },
  { surface: "marketing", name: "Getting Started", url: "https://trilogycare.com.au/getting-started" },
  { surface: "marketing", name: "Contact", url: "https://trilogycare.com.au/contact" },

  // --- TC Pricing Website (public staging deploy, AWS ELB) ---
  { surface: "pricing", name: "Pricing Home", url: "http://tc-pricing-website-staging-alb-932992966.ap-southeast-2.elb.amazonaws.com/" },
];

export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 }, // iPhone 12/13/14 logical size
};

// Impact weights for score computation.
export const IMPACT_WEIGHTS = { critical: 10, serious: 5, moderate: 2, minor: 1 };
