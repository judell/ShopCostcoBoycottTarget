# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands
- Start server: `node server.js`
- Application runs at http://localhost:3000

## Code Style Guidelines
- ES6 module syntax for imports (`import x from 'y'`)
- React functional components with hooks
- PascalCase for components (StoreLocator)
- camelCase for variables and functions
- Use async/await for async operations
- Handle errors with try/catch in async functions
- Use Tailwind CSS for styling

## Project Structure
- React front-end with Express back-end
- Component files in /components
- CSV data in /data directory
- Main Express server in server.js

## Dependencies
- React
- Express
- PapaParse (CSV parsing)
- Lodash (data manipulation)