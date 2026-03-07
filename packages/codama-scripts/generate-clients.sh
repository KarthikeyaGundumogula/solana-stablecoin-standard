#!/bin/bash
set -e

echo "building.."
anchor build

echo "Generating clients for programs..."

echo "Generating sss-program clients..."
npx codama run --all -c packages/codama-scripts/sss-token.json

echo "Clients generated successfully!"