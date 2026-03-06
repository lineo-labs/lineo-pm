import React from "react";

const I = ({ d, stroke = "currentColor" }: { d: string; stroke?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke}
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: "inline-block", verticalAlign: "middle", marginRight: "7px", opacity: 0.75, flexShrink: 0 }}
  >
    <path d={d} />
  </svg>
);

const Label = ({ icon, children }: { icon: React.ReactNode; children: string }) => (
  <span style={{ display: "inline-flex", alignItems: "center" }}>
    {icon}
    {children}
  </span>
);

export default {
  index: "Home",

  "why-lineo": {
    title: (
      <Label icon={<I d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />}>
        Why Lineo
      </Label>
    ),
  },

  demo: {
    title: (
      <Label icon={<I d="M5 3l14 9-14 9V3z" />}>
        Demo
      </Label>
    ),
  },

  "getting-started": {
    title: (
      <Label icon={<I d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />}>
        Getting Started
      </Label>
    ),
    collapsed: true,
  },

  concepts: {
    title: (
      <Label icon={<I d="M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.3 6l-.7 3H9l-.7-3A7 7 0 0 1 5 9a7 7 0 0 1 7-7zM9 20h6M10 23h4" />}>
        Concepts
      </Label>
    ),
    collapsed: true,
  },

  guides: {
    title: (
      <Label icon={<I d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />}>
        Guides
      </Label>
    ),
    collapsed: true,
  },

  architecture: {
    title: (
      <Label icon={<I d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />}>
        Architecture
      </Label>
    ),
    collapsed: true,
  },

  "api-reference": {
    title: (
      <Label icon={<I d="M16 18l6-6-6-6M8 6l-6 6 6 6" />}>
        API Reference
      </Label>
    ),
    collapsed: true,
  },

  contributing: {
    title: (
      <Label icon={<I d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />}>
        Contributing
      </Label>
    ),
    collapsed: true,
  },
};
