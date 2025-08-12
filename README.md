# Commission Builder
 An HTML, CSS, and JS base site that handles the creation of commission requests, via fields and preferences entered by the user. The site then exports the results as a pdf "commission-document" that can be sent to the artist when requesting a commission.

To change colors: Edit config/theme-config.json

To update prices: Edit config/commission-config.json

To add new currency: Add to config/commission-config.json


## 📸 Thumbnail Configuration Guide

All thumbnail settings are in `config/commission-config.json` under the `"thumbnails"` section.

### Simple Example - Change a Commission Type Thumbnail:
```json
"thumbnails": {
  "commissionTypes": {
    "2d": "images/my-new-2d-image.png",
    "3d": "images/my-3d-render.jpg",
    "other": "images/reference-sheet.png"
  }
}
```

### Change a Subtype Thumbnail:
```json
"thumbnails": {
  "subTypes": {
    "simplified": "images/chibi-example.png",
    "headshot": "images/portrait-example.jpg",
    "bust": "images/bust-example.png",
    "fullbody": "images/fullbody-example.png"
  }
}
```

## 🔧 Configuration Options

### Commission Type Thumbnails
These appear on the first page where users select their commission type:
- `"2d"` - 2D Illustration/Sketch thumbnail
- `"3d"` - 3D Blender Render thumbnail  
- `"other"` - Reference Sheets thumbnail

### Subtype Thumbnails
These appear on the second page where users select their specific subtype:
- `"simplified"` - Simplified/Chibi artwork
- `"headshot"` - Head shot examples
- `"bust"` - Bust/upper body examples
- `"fullbody"` - Full body artwork
- `"basicModel"` - Basic 3D models
- `"detailedModel"` - Detailed 3D models
- `"fullScene"` - Full 3D scenes
- `"ref_basic"` - Basic reference sheets
- `"ref_dnd"` - D&D character sheets

### Image Settings
Control how images are displayed:
```json
"settings": {
  "width": 290,           // Thumbnail width in pixels
  "height": 120,          // Thumbnail height in pixels
  "objectFit": "cover",   // How image fits: "cover", "contain", "fill"
  "borderRadius": "10px"  // Rounded corners
}
```

### Fallback Image
If a thumbnail is missing, this image will be used:
```json
"fallback": "images/default-thumbnail.png"
```

### Supported Formats:
- ✅ PNG (.png)
- ✅ JPEG (.jpg, .jpeg)
- ✅ WebP (.webp)
- ✅ SVG (.svg)
- ✅ GIF (.gif)

### Image Paths:
- **Relative paths**: `"images/my-image.png"` (recommended)
- **Absolute URLs**: `"https://example.com/image.png"`
- **Data URLs**: `"data:image/png;base64,..."` (for embedded images)

### Image Optimization:
- **Recommended size**: 290x120 pixels (matches default settings)
- **File size**: Keep under 500KB for fast loading
- **Format**: PNG for artwork with transparency, JPEG for photos

### Error Handling:
- If an image doesn't load, the fallback image is used automatically
- If the fallback also fails, a "No Image" placeholder appears
- Check browser console for loading errors


## 🛠 Troubleshooting

### Image Looks Stretched?
- Change `"objectFit"` to `"contain"` instead of `"cover"`
- Adjust `"width"` and `"height"` to match your image proportions

### Need Different Sizes?
Update the settings:
```json
"settings": {
  "width": 400,
  "height": 200,
  "objectFit": "cover"
}
```

---

