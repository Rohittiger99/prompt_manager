import { Product } from "../types";

const helpingtools: Product = {
  // ─── Identity ───────────────────────────────────────
  slug: "helpingtools",
  name: "HelpingTools",
  tagline: "70+ Free Browser-Based Utilities",
  description: "A comprehensive super-app offering over 70 free tools for developers, designers, and everyday users. Includes utilities for PDF manipulation, image conversion, text formatting, and developer tools. Everything runs locally in your browser for maximum privacy—no files are ever uploaded to a server.",
  shortDescription: "70+ free, private browser tools for PDF, Image, Text & Devs. No uploads, no signup.",

  // ─── Classification ─────────────────────────────────
  type: "web-app",
  status: "live",
  category: "Utilities",
  tags: ["pdf-tools", "image-converter", "developer-tools", "text-formatter", "privacy-first", "browser-based", "free"],
  platforms: ["chrome", "firefox", "edge", "android"],

  // ─── Branding ───────────────────────────────────────
  icon: "/icons/helpingtools.png",
  screenshots: [
    "/screenshots/helpingtools-1.png",
    "/screenshots/helpingtools-2.png",
    "/screenshots/helpingtools-3.png",
  ],
  accentColor: "#FF4D00",

  // ─── Pricing ────────────────────────────────────────
  pricing: {
    type: "free",
    plans: [
      {
        name: "Free",
        price: 0,
        currency: "USD",
        features: [
          "Access to 70+ tools",
          "100% local processing",
          "No file size limits (browser dependent)",
          "No account required",
          "Works offline (PWA)",
        ],
      },
    ],
  },

  // ─── Store Link ─────────────────────────────────────
  storeUrl: "https://helpingtools.com",

  // ─── Privacy & Permissions ──────────────────────────
  permissions: [],
  dataCollected: "None",
  dataSentOffDevice: false,
  dataSharedWithThirdParties: false,

  // ─── Features ───────────────────────────────────────
  features: [
    {
      icon: "ShieldCheck",
      title: "100% Private & Secure",
      description: "All processing happens locally in your browser. Your files and data never leave your device.",
    },
    {
      icon: "Zap",
      title: "Lightning Fast",
      description: "Instant results with no server upload or download wait times.",
    },
    {
      icon: "Layers",
      title: "70+ Tools in One Place",
      description: "Everything from PDF handling to base64 encoding, right at your fingertips.",
    },
    {
      icon: "Search",
      title: "Global Command Search",
      description: "Quickly find any tool using the Cmd+K fuzzy search modal.",
    },
    {
      icon: "WifiOff",
      title: "Works Offline",
      description: "PWA support means you can install the app and use it even without an internet connection.",
    }
  ],

  // ─── FAQ ────────────────────────────────────────────
  faq: [
    {
      question: "Is HelpingTools really free?",
      answer: "Yes, it is 100% free to use with no hidden fees, limits, or premium tiers.",
    },
    {
      question: "Are my files uploaded to your servers?",
      answer: "No. Everything runs via WebAssembly and JavaScript locally in your browser. Your files are completely private.",
    },
    {
      question: "Does it work on mobile?",
      answer: "Yes, HelpingTools is a fully responsive PWA (Progressive Web App) that works great on phones and tablets.",
    },
  ],

  // ─── Changelog (optional) ───────────────────────────
  changelog: [
    {
      version: "1.0.0",
      date: "2026-05-11",
      changes: [
        "Initial release with 70+ tools",
        "PWA offline support",
        "Cmd+K global search modal",
        "Comprehensive SEO and metadata",
      ],
    },
  ],

  // ─── SEO ────────────────────────────────────────────
  seo: {
    title: "HelpingTools — 70+ Free Online Tools | Rohit Tiger",
    description: "Free browser-based tools for PDF, Image, Text & Developers. 100% private — files never leave your device. No signup required.",
    keywords: ["online tools", "pdf tools", "image converter", "developer utilities", "free tools", "browser based", "privacy first"],
  },

  publishedAt: "2026-05-11",
  featured: true,
};

export default helpingtools;
