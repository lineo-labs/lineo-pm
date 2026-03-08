#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(__dirname, '..');
const nextDir = path.join(docsDir, '.next/static');
const publicDir = path.join(docsDir, 'public');
const outDir = path.join(docsDir, 'out');

// Create out directory
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Function to copy files recursively
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const files = fs.readdirSync(src);
  files.forEach(file => {
    const srcFile = path.join(src, file);
    const destFile = path.join(dest, file);
    const stat = fs.statSync(srcFile);

    if (stat.isDirectory()) {
      copyDir(srcFile, destFile);
    } else {
      fs.copyFileSync(srcFile, destFile);
    }
  });
}

// Copy Next.js static files
copyDir(nextDir, path.join(outDir, '_next', 'static'));

// Copy public files if they exist
if (fs.existsSync(publicDir)) {
  copyDir(publicDir, outDir);
}

console.log('✅ Export completed. Files copied to ./out');
