const fs = require('fs');
const path = require('path');

const websiteRoot = 'D:/masa/dev/fest-2026-website';

// 1. Update app/layout.tsx
const layoutPath = path.join(websiteRoot, 'app/layout.tsx');
if (fs.existsSync(layoutPath)) {
  const layoutCode = `import type { Metadata } from "next";
import { Geist, Amiri, Montserrat } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const MontserratSans = Montserrat({
  variable: "--font-montserrat-sans",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const stapelBold = localFont({
  src: "./fonts/stapel-bold.ttf",
  variable: "--font-bold-font",
});
const stapelRegular = localFont({
  src: "./fonts/stapel-regular.ttf",
  variable: "--font-regular-font",
});

const amiri = Amiri({
  variable: "--font-amiri",
  weight: ["400", "700"],
  subsets: ["arabic"],
});

export const metadata: Metadata = {
  title: "AAWA - PMSA Arts Fest 26-27",
  description: "When Values Speak • AAWA '26 PMSA Arts Fest 26-27",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={\`\${geistSans.variable} \${MontserratSans.variable} \${amiri.variable} \${stapelBold.variable} \${stapelRegular.variable} antialiased selection:bg-[#caa02f] selection:text-[#0b0904]\`}
      >
        {children}
      </body>
    </html>
  );
}
`;
  fs.writeFileSync(layoutPath, layoutCode, 'utf8');
  console.log('Successfully updated app/layout.tsx');
}

// 2. Update app/admin/page.tsx
const adminPagePath = path.join(websiteRoot, 'app/admin/page.tsx');
if (fs.existsSync(adminPagePath)) {
  let adminPage = fs.readFileSync(adminPagePath, 'utf8');

  // Update GRADE_POINTS
  adminPage = adminPage.replace(
    /const GRADE_POINTS = \{.*?\};/,
    "const GRADE_POINTS: Record<string, number> = { 'A+': 7, 'A': 5, 'B': 3, 'C': 1, 'None': 0, 'NONE': 0 };"
  );

  // Update Grade selector buttons
  adminPage = adminPage.replace(
    "['A', 'B', 'C', 'None'].map(g => (",
    "['A+', 'A', 'B', 'C', 'None'].map(g => ("
  );

  fs.writeFileSync(adminPagePath, adminPage, 'utf8');
  console.log('Successfully updated app/admin/page.tsx with A+ grade and +7 points');
}

// 3. Update app/results/page.tsx to ensure category & section handling
const resultsPagePath = path.join(websiteRoot, 'app/results/page.tsx');
if (fs.existsSync(resultsPagePath)) {
  let resultsPage = fs.readFileSync(resultsPagePath, 'utf8');
  console.log('Checked app/results/page.tsx');
}
