#!/usr/bin/env python3
"""
Create placeholder images for nutrient deficiency demonstrations
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_placeholder_image(filename, title, description, stage_color):
    """Create a placeholder image for nutrient deficiency"""
    
    # Image dimensions
    width, height = 400, 300
    
    # Color scheme based on deficiency stage
    if stage_color == 'early':
        bg_color = (255, 255, 200)  # Light yellow
        text_color = (100, 100, 0)
    elif stage_color == 'severe':
        bg_color = (255, 200, 200)  # Light red
        text_color = (150, 0, 0)
    else:  # moderate
        bg_color = (255, 230, 200)  # Light orange
        text_color = (150, 75, 0)
    
    # Create image
    img = Image.new('RGB', (width, height), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Try to use a system font, fallback to default
    try:
        title_font = ImageFont.truetype('/System/Library/Fonts/Arial.ttf', 24)
        desc_font = ImageFont.truetype('/System/Library/Fonts/Arial.ttf', 14)
    except:
        title_font = ImageFont.load_default()
        desc_font = ImageFont.load_default()
    
    # Draw title
    title_bbox = draw.textbbox((0, 0), title, font=title_font)
    title_x = (width - (title_bbox[2] - title_bbox[0])) // 2
    draw.text((title_x, 40), title, fill=text_color, font=title_font)
    
    # Draw description (wrapped)
    words = description.split(' ')
    lines = []
    current_line = []
    
    for word in words:
        test_line = ' '.join(current_line + [word])
        test_bbox = draw.textbbox((0, 0), test_line, font=desc_font)
        if (test_bbox[2] - test_bbox[0]) > width - 40:
            if current_line:
                lines.append(' '.join(current_line))
                current_line = [word]
            else:
                lines.append(word)
        else:
            current_line.append(word)
    
    if current_line:
        lines.append(' '.join(current_line))
    
    # Draw description lines
    y_start = 100
    for i, line in enumerate(lines):
        line_bbox = draw.textbbox((0, 0), line, font=desc_font)
        line_x = (width - (line_bbox[2] - line_bbox[0])) // 2
        draw.text((line_x, y_start + i * 20), line, fill=text_color, font=desc_font)
    
    # Add "PLACEHOLDER IMAGE" watermark
    watermark_font = desc_font
    watermark_text = "PLACEHOLDER IMAGE"
    watermark_bbox = draw.textbbox((0, 0), watermark_text, font=watermark_font)
    watermark_x = (width - (watermark_bbox[2] - watermark_bbox[0])) // 2
    draw.text((watermark_x, height - 40), watermark_text, fill=(128, 128, 128), font=watermark_font)
    
    # Save image
    img.save(filename, 'JPEG', quality=85)
    print(f"Created placeholder image: {filename}")

# Create placeholder images for each nutrient deficiency
deficiency_images = [
    ('nitrogen_deficiency_lettuce.jpg', 'Nitrogen Deficiency', 'Lettuce showing pale yellow lower leaves', 'early'),
    ('nitrogen_deficiency_basil_severe.jpg', 'Severe Nitrogen Deficiency', 'Basil with yellow leaves progressing to brown', 'severe'),
    ('potassium_deficiency_tomato.jpg', 'Potassium Deficiency', 'Tomato leaves showing brown leaf edges', 'moderate'),
    ('potassium_deficiency_lettuce_mild.jpg', 'Early Potassium Deficiency', 'Lettuce with yellowing of leaf margins', 'early'),
    ('phosphorus_deficiency_basil.jpg', 'Phosphorus Deficiency', 'Basil showing purple-red discoloration', 'moderate'),
    ('iron_deficiency_lettuce.jpg', 'Iron Deficiency', 'Lettuce showing interveinal chlorosis', 'moderate'),
    ('iron_deficiency_spinach_severe.jpg', 'Severe Iron Deficiency', 'Spinach with almost white young leaves', 'severe'),
    ('calcium_deficiency_lettuce_tipburn.jpg', 'Calcium Deficiency', 'Lettuce showing tip burn', 'moderate'),
    ('magnesium_deficiency_tomato.jpg', 'Magnesium Deficiency', 'Tomato with interveinal chlorosis', 'moderate'),
]

# Create images directory if it doesn't exist
os.makedirs('images/deficiencies', exist_ok=True)

# Generate all placeholder images
for filename, title, description, stage in deficiency_images:
    filepath = os.path.join('images/deficiencies', filename)
    create_placeholder_image(filepath, title, description, stage)

print(f"\n✅ Created {len(deficiency_images)} placeholder images")
print("💡 These are demonstration placeholders - replace with real deficiency photos for production use")