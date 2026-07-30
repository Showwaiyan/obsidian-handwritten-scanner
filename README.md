# Obsidian Handwritten Scanner

A powerful Obsidian plugin for scanning, processing, and enhancing handwritten notes and documents. Transform photos of your handwritten notes into clean, processed images with automatic perspective correction, background removal, and advanced filtering.

<a href="https://www.buymeacoffee.com/Showwaiyan" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

## DEMO
![Demo](./assets/demo.gif)

## Features

### 📸 Image Upload & Processing
- **Multiple Input Methods**: Upload from file picker or capture directly from camera
- **Smart Perspective Correction**: Automatically detect and correct document corners with interactive crop points
- **Rotation Controls**: Rotate images in 90-degree increments for proper orientation
- **HiDPI Support**: Full support for high-resolution displays (Retina, 4K, etc.)

### 🎨 Advanced Image Enhancement
- **Background Removal**:
  - Click-to-sample background color detection
  - Adjustable tolerance slider (0-50)
  - Real-time preview with checkerboard pattern for transparency
  - Export with true transparent background (PNG)

- **Image Filters**:
  - Brightness adjustment (-100 to +100)
  - Contrast enhancement (-100 to +100)
  - Saturation control (-100 to +100)
  - Black & White conversion
  - Real-time preview with 200ms debouncing

### 💾 Export Options
- **Multiple Formats**:
  - PNG (with transparency support)
  - SVG (embedded PNG wrapper)
  - JPG
- **Flexible Storage**:
  - Configurable default export folder
  - Automatic timestamp-based filename generation
  - Custom filename support with validation
  - Direct save to Obsidian vault

### 🎯 User Experience
- **Visual Feedback**:
  - Checkerboard pattern for transparent areas during editing
  - Magnifying loupe when dragging crop points
  - Real-time filter preview
  - Clear status notifications

- **Touch & Mouse Support**:
  - Responsive controls for both desktop and mobile
  - Larger touch targets (30px) for mobile devices
  - Drag-and-drop crop point adjustment

## Installation

### From Obsidian Community Plugins (Coming Soon)
1. Open Obsidian Settings
2. Navigate to Community Plugins
3. Search for "Handwritten Scanner"
4. Click Install
5. Enable the plugin

### Beta Testing with BRAT (Recommended for now)

**⚠️ Important:** Manual installation may cause the plugin to crash on mobile devices. Until the official community plugin release, we recommend using BRAT for installation.

1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat) from Obsidian Community Plugins:
   - Open Obsidian Settings → Community Plugins
   - Search for "BRAT" (Beta Reviewers Auto-update Tool)
   - Install and enable BRAT

2. Add this plugin via BRAT:
   - Open BRAT settings (Settings → BRAT)
   - Click "Add Beta plugin"
   - Enter: `showwaiyan/obsidian-scan-sketch`
   - Click "Add Plugin"

3. Enable the plugin:
   - Go to Settings → Community Plugins
   - Find "Sketch Scanner" and enable it

BRAT will automatically keep the plugin updated with the latest releases.

### Manual Installation (Desktop Only)

**⚠️ Warning:** Manual installation can cause crashes on mobile devices. Use BRAT instead if you use Obsidian on mobile.

1. Download the latest release from GitHub
2. Extract files to `VaultFolder/.obsidian/plugins/obsidian-scan-sketch/`
3. Reload Obsidian
4. Enable plugin in Settings → Community Plugins

## Usage

### Basic Workflow

1. **Open Scanner Modal**
   - Click the scan icon in the ribbon (left sidebar)
   - Or use Command Palette: "Open Scanner"

2. **Upload Image**
   - Click "Upload" to select from files
   - Or click "Camera" to capture directly (if available)

3. **Adjust & Process**
   - **Rotate**: Click rotation buttons to orient correctly
   - **Crop**: Click "Crop" to show corner points, drag to adjust, click "Apply"
   - **Filters**: Adjust sliders for brightness, contrast, saturation
   - **Background Removal**: Click to sample background color, adjust tolerance

4. **Export**
   - Click "Export" button (download icon)
   - Choose format (PNG/SVG)
   - Enter filename or use auto-generated timestamp
   - Click "Export" to save to vault

### Background Removal

1. Click the background removal icon
2. Click on any background area to sample the color
3. Adjust tolerance slider to fine-tune selection
4. Preview shows transparent areas with checkerboard pattern
5. Click "Apply" to confirm or "Cancel" to revert
6. Export as PNG to preserve transparency

### Perspective Crop

1. Click "Crop" button to show corner points
2. Drag the four blue corner points to match document edges
3. Click "Apply" to transform the quadrilateral into a rectangle
4. The image automatically adjusts to the corrected perspective

## Settings

Access plugin settings via Settings → Obsidian Handwritten Scanner:

- **Export Default Folder**: Set the default folder for saving scanned images (default: root)

## Optional: Enhanced Notebook Styling

For enhanced visual styling with notebook-themed backgrounds and pen colors, you can optionally add CSS snippets from the [Obsidian-Notebook-Themes](https://github.com/CyanVoxel/Obsidian-Notebook-Themes) repository by [@CyanVoxel](https://github.com/CyanVoxel).

### How to Add Notebook Theme CSS:

1. Visit the [Obsidian-Notebook-Themes repository](https://github.com/CyanVoxel/Obsidian-Notebook-Themes)
2. Download the CSS snippets you want (e.g., notebook background colors, pen colors)
3. In Obsidian, go to Settings → Appearance → CSS snippets
4. Click the folder icon to open your snippets folder
5. Copy the CSS files into this folder
6. Return to Obsidian and enable the snippets

### Available Notebook Themes:

- **Page Backgrounds**: Manila, White, Blueprint
- **Pen Colors**: White, Gray, Black, Red, Green, Blue, Light Blue, Purple
- **Grid Patterns**: Optional grid overlay for notebook paper effect
- **Image Recoloring**: Recolor images to match your pen color theme

**Example Usage in Notes:**
```markdown
---
cssclasses: page-manila pen-black recolor-images
---
```

This applies a manila (tan) page background with black pen styling and recolors images accordingly.

**Important Limitations:**
- 📌 **SVG Export Only**: The notebook background and image recoloring functionality only works with **SVG exports**, not PNG exports.
- For best results with notebook themes, always export as SVG format.
- PNG exports will preserve transparency but won't apply CSS-based recoloring effects.

**Note**: These CSS snippets are completely optional. The plugin works perfectly without them. They simply provide additional theming options for your scanned notes to match a physical notebook aesthetic.

## Technical Architecture

### Project Structure

```
obsidian-handwritten-scanner/
├── main.ts                 # Plugin entry point
├── Services/              # Business logic & utilities
│   ├── CanvasRenderer.ts       # Canvas drawing utilities
│   ├── CropPointManager.ts     # Crop point logic
│   ├── ImageBackgroundRemoval.ts  # Background removal algorithms
│   ├── ImageExport.ts          # PNG/SVG export
│   ├── ImageFilter.ts          # Image filtering
│   ├── ImageTransform.ts       # Rotation & perspective transforms
│   ├── ImageUpload.ts          # File upload handling
│   ├── Interaction.ts          # User interaction utilities
│   ├── VaultExport.ts          # Obsidian vault operations
│   └── types.ts                # TypeScript type definitions
├── UI/                    # User interface components
│   ├── Components/
│   │   ├── BackgroundRemovalControls.ts
│   │   ├── ExportControls.ts
│   │   ├── FilterControls.ts
│   │   └── ImagePreview.ts
│   └── Modals/
│       ├── ExportModal.ts
│       └── scannerModal.ts
├── test/                  # Vitest test suite
└── styles.css            # Plugin styles
```

### Key Technologies

- **TypeScript**: Type-safe development with strict null checks
- **Obsidian API**: Native integration with Obsidian
- **Canvas API**: Image rendering and manipulation
- **perspective-transform**: Perspective correction library
- **Vitest**: Fast unit testing with happy-dom
- **esbuild**: Lightning-fast bundling

### Code Quality

- **Testing**: 125+ unit tests with >90% coverage
- **Linting**: ESLint with TypeScript support
- **Formatting**: EditorConfig (tabs, double quotes, LF)
- **Type Safety**: Strict TypeScript configuration
- **Documentation**: JSDoc comments for public APIs

## Development

### Prerequisites
- Node.js v16 or higher
- npm or yarn

### Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/obsidian-handwritten-scanner.git

# Install dependencies
npm install

# Start development mode (watch)
npm run dev

# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Build for production
npm run build
```

### Commands

- `npm run dev` - Watch mode compilation with esbuild
- `npm run build` - Production build with TypeScript checking
- `npm test` - Run all tests with Vitest
- `npm run test:ui` - Interactive test UI dashboard
- `npm run test:coverage` - Generate coverage report
- `npm run version` - Bump version and update manifest/versions.json

### Testing

Run specific tests:
```bash
# Single test file
npx vitest test/ImagePreview.test.ts

# Single test case
npx vitest -t "should initialize"

# Watch mode
npx vitest --watch
```

### Code Style

- **Indentation**: Tabs (width 4)
- **Quotes**: Double quotes
- **Semicolons**: Required
- **Imports**: Obsidian imports first, then blank line, then local imports with path aliases
- **Path Aliases**: Use `Services/` and `UI/` instead of relative paths

Example:
```typescript
import { App, Modal, Notice } from "obsidian";

import { uploadImageToCanvas } from "Services/ImageUpload";
import { ImagePreview } from "UI/Components/ImagePreview";
```

## Changelog

### Version 1.0.0 (Current)

**Features:**
- Initial release
- Image upload and camera capture
- Perspective correction with interactive crop points
- Image rotation (90° increments)
- Advanced filters (brightness, contrast, saturation, B&W)
- Background removal with tolerance adjustment
- PNG/SVG export with transparency support
- Checkerboard pattern for transparent areas
- Configurable export folder
- Touch and mouse support
- HiDPI display support

**Bug Fixes:**
- Fixed transparent background export (removed black background fill)
- Fixed background removal cropping issue (DPR dimension mismatch)
- Fixed checkerboard contamination in background removal

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Follow code style**: Use tabs, double quotes, proper imports
4. **Write tests**: Add tests for new features
5. **Run tests**: `npm test` (all tests must pass)
6. **Build**: `npm run build` (must build without errors)
7. **Commit**: Use clear, descriptive commit messages
8. **Push**: `git push origin feature/amazing-feature`
9. **Open a Pull Request**

## License

This project is licensed under the OBSD License - see the LICENSE file for details.

## Support

- **Issues**: Report bugs on [GitHub Issues](https://github.com/yourusername/obsidian-handwritten-scanner/issues)
- **Discussions**: Ask questions in [GitHub Discussions](https://github.com/yourusername/obsidian-handwritten-scanner/discussions)
- **Documentation**: See [Obsidian Plugin Guidelines](https://docs.obsidian.md/Plugins)

## Acknowledgments

- Built with [Obsidian API](https://github.com/obsidianmd/obsidian-api)
- Uses [perspective-transform](https://github.com/jlouthan/perspective-transform) for perspective correction
- Optional notebook theme CSS snippets available from [Obsidian-Notebook-Themes](https://github.com/CyanVoxel/Obsidian-Notebook-Themes) by [@CyanVoxel](https://github.com/CyanVoxel) (v2.2.3)
- Inspired by document scanning apps and the Obsidian community

---

**Made with ❤️ for the Obsidian community**
