const fs = require('fs');
const path = require('path');

// Simple SVG placeholder generator
function createPlaceholderSVG(title, description, color) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color};stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:${color};stop-opacity:0.1" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#grad1)"/>
  <rect x="10" y="10" width="380" height="280" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="5,5"/>
  
  <!-- Leaf icon -->
  <path d="M200 80 Q180 60 160 80 Q180 100 200 80 Q220 60 240 80 Q220 100 200 80" fill="${color}" opacity="0.6"/>
  
  <!-- Title -->
  <text x="200" y="130" font-family="Arial, sans-serif" font-size="18" font-weight="bold" text-anchor="middle" fill="${color}">${title}</text>
  
  <!-- Description -->
  <text x="200" y="160" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="${color}" opacity="0.8">${description}</text>
  
  <!-- Watermark -->
  <text x="200" y="270" font-family="Arial, sans-serif" font-size="10" text-anchor="middle" fill="#999">PLACEHOLDER IMAGE</text>
</svg>`;
}

// Create placeholder images for each deficiency
const placeholderImages = [
    {
        filename: 'nitrogen_deficiency_lettuce.jpg',
        title: 'Nitrogen Deficiency',
        description: 'Lettuce - Early Stage',
        color: '#FFA500'
    },
    {
        filename: 'nitrogen_deficiency_basil_severe.jpg',
        title: 'Severe Nitrogen Deficiency',
        description: 'Basil - Advanced Stage',
        color: '#FF6B47'
    },
    {
        filename: 'potassium_deficiency_tomato.jpg',
        title: 'Potassium Deficiency',
        description: 'Tomato - Moderate Stage',
        color: '#FF8C69'
    },
    {
        filename: 'potassium_deficiency_lettuce_mild.jpg',
        title: 'Early Potassium Deficiency',
        description: 'Lettuce - Mild Symptoms',
        color: '#FFB347'
    },
    {
        filename: 'phosphorus_deficiency_basil.jpg',
        title: 'Phosphorus Deficiency',
        description: 'Basil - Purple Discoloration',
        color: '#DA70D6'
    },
    {
        filename: 'iron_deficiency_lettuce.jpg',
        title: 'Iron Deficiency',
        description: 'Lettuce - Interveinal Chlorosis',
        color: '#98FB98'
    },
    {
        filename: 'iron_deficiency_spinach_severe.jpg',
        title: 'Severe Iron Deficiency',
        description: 'Spinach - White Young Leaves',
        color: '#F0FFF0'
    },
    {
        filename: 'calcium_deficiency_lettuce_tipburn.jpg',
        title: 'Calcium Deficiency',
        description: 'Lettuce - Tip Burn',
        color: '#D2691E'
    },
    {
        filename: 'magnesium_deficiency_tomato.jpg',
        title: 'Magnesium Deficiency',
        description: 'Tomato - Interveinal Chlorosis',
        color: '#90EE90'
    }
];

// Ensure directory exists
const deficienciesDir = path.join(__dirname, 'images', 'deficiencies');
if (!fs.existsSync(deficienciesDir)) {
    fs.mkdirSync(deficienciesDir, { recursive: true });
}

console.log('Creating placeholder images...');

placeholderImages.forEach(image => {
    const svgContent = createPlaceholderSVG(image.title, image.description, image.color);
    const svgPath = path.join(deficienciesDir, image.filename.replace('.jpg', '.svg'));
    
    fs.writeFileSync(svgPath, svgContent);
    console.log(`✓ Created ${image.filename.replace('.jpg', '.svg')}`);
});

// Also create a simple .htaccess or fallback for missing JPGs
const htaccessContent = `# Fallback for missing JPG files
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_URI} \\.jpg$
RewriteRule ^(.+)\\.jpg$ $1.svg [L,R=302]`;

fs.writeFileSync(path.join(deficienciesDir, '.htaccess'), htaccessContent);

console.log(`\n✅ Created ${placeholderImages.length} placeholder SVG images`);
console.log('💡 These SVGs serve as placeholders until real deficiency photos are uploaded');
console.log('💡 The .htaccess file provides fallback from .jpg to .svg for missing images');