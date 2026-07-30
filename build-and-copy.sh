#!/bin/bash

# Build the plugin
echo "Building plugin..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi

# Define the vault plugin directory
# Update this path to your actual Obsidian vault location
VAULT_PLUGIN_DIR="$HOME/Documents/Obsidian/Plugin Dev Vault/.obsidian/plugins/scan-sketch"

# Create the plugin directory if it doesn't exist
mkdir -p "$VAULT_PLUGIN_DIR"

# Copy the built files
echo "Copying files to $VAULT_PLUGIN_DIR..."
cp main.js "$VAULT_PLUGIN_DIR/"
cp manifest.json "$VAULT_PLUGIN_DIR/"
cp styles.css "$VAULT_PLUGIN_DIR/"

echo "✅ Plugin built and copied successfully!"
echo "Now reload Obsidian to test your changes."
