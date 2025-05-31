# Project Clippy – Save & Reuse Snippets Instantly

Tired of typing the same thing over and over?

Project Clippy lets you save and organize reusable call-to-actions and formatted snippets so you can paste them anytime, anywhere. Just copy the text, open the extension, and save it — optionally with a title so you know exactly what it’s for.

## Features:

- Copy and save any text snippet to your Clippy library
- Add optional titles to keep your snippets organized
- Quickly paste saved snippets anywhere with a right-click
- Works across editable fields, forms, and input boxes
- All snippets are stored locally — nothing is uploaded or shared

Project Clippy keeps your go-to phrases a click away and your workflow frictionless.

## Development

This project is built with Vite, React, TypeScript, Tailwind CSS, and shadcn/ui.

### Setup

1. Clone the repository.
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder in the project directory.

### Build

To build the extension for production:
`npm run build`
This will create a `dist` folder ready to be packed or loaded into Chrome.
