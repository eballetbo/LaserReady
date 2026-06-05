# LaserReady

LaserReady is a versatile vector editor designed for laser cutting and engraving workflows, available as both a web and desktop application. It allows users to create, import, and edit vector designs, setting specific parameters for cutting, scoring, and engraving.

A live preview of the tool can be found [here](https://editor.klaab.cat).

## Features

-   **Vector Editing**: Create and edit paths, rectangles, circles, polygons, and stars.
-   **Laser Modes**: Assign specific operations (Cut, Score, Engrave) to different elements.
-   **SVG Support**: Import and export standard SVG files.
-   **Boolean Operations**: Unite, Subtract, Intersect, and Exclude shapes.
-   **Parametric Shapes**: Adjust properties like polygon sides or star points dynamically.
-   **Material Library**: Configure material dimensions for accurate previews.

## Getting Started

### Prerequisites

-   Node.js (v20 or higher)
-   npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/eballetbo/LaserReady
    cd LaserReady
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### Desktop Development (Electron)

Start the application in Electron mode:

```bash
npm run dev:electron
```

This launches the standalone desktop window with hot-reloading enabled.

### Building for Production

Build the application for production:

```bash
npm run build
```

### Building for Flatpak (Linux)

To create a Flatpak package (requires `flatpak` and `flatpak-builder` installed):

```bash
npm run build:linux
```

## Tech Stack

-   **React**: UI Framework
-   **Vite**: Build tool
-   **Tailwind CSS**: Styling
-   **Lucide React**: Icons
-   **Electron**: Desktop Wrapper
-   **Paper.js** (Internal usage for boolean operations)

## License

GPL-3.0 — see [LICENSE](LICENSE) for details.

## Support

If you find this project useful, please consider supporting the developer by buying them a coffee.

<p align="center">
  <a href="https://www.buymeacoffee.com/eballetbo" target="_blank" rel="noopener noreferrer">
    <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me a Coffee" width="140"/>
  </a>
</p>