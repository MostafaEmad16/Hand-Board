# Touchless Web Gesture Interface

## Overview

Touchless Web Gesture Interface is a web application that enables users to interact with digital elements using hand gestures captured via a standard webcam. By leveraging computer vision technology, specifically MediaPipe Hands, the application tracks hand landmarks in real-time to control a virtual cursor, perform click actions, drag elements, and draw on a virtual canvas without any physical contact with input devices.

## Features

- **Real-time Hand Tracking**: Utilizes MediaPipe for high-performance hand detection and landmark tracking directly in the browser.
- **Virtual Cursor**: Maps the user's index finger position to a screen cursor with smoothing for precision.
- **Gesture Recognition**:
    - **Pinch Interaction**: Detects thumb and index finger pinch to simulate mouse clicks and drag operations.
    - **Fist Detection**: Identifies a closed fist gesture, used for state changes or tool toggling.
- **Interactive Board**:
    - **Sticky Notes**: Users can grab and move virtual sticky notes using the pinch gesture.
    - **Drawing Canvas**: Freehand drawing capabilities activated by gestures.
- **Modern Architecture**: Built with React, TypeScript, and Vite for performance and maintainability.

## Technology Stack

- **Frontend Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Computer Vision**: Google MediaPipe Tasks Vision
- **Styling**: CSS Modules / Custom CSS Variables (Glassmorphism design system)

## Prerequisites

- Node.js (Version 16 or higher recommended)
- TPM/NPM package manager
- A computer with a functional webcam

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/matheussiqueirahub/touchless-web-gesture-interface.git
   ```

2. Navigate to the project directory:
   ```bash
   cd touchless-web-gesture-interface
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

## Usage

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to the local URL provided (usually `http://localhost:5173`).

3. Grant camera permissions when prompted by the browser.

4. **Interaction Guide**:
    - **Move Cursor**: Move your hand in front of the camera. The cursor follows your index finger.
    - **Click / Drag**: Pinch your thumb and index finger together.
    - **Draw**: Pinch and move your hand while in an empty area.
    - **Stop Drawing**: Opening your hand (releasing the pinch) or forming a fist stops the drawing action.

## Project Structure

```
src/
├── components/         # React components (VideoFeed, CanvasOverlay, NotesBoard)
├── context/           # Global state management
├── hooks/             # Custom hooks (useHandTracking, useGestureEngine)
├── utils/             # Helper functions (geometry, gesture logic)
├── App.tsx            # Main application component
└── main.tsx           # Entry point
```

## Contributing

1. Fork the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

## License

This project is distributed under the MIT License. See `LICENSE` for more information.
