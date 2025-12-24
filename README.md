# LaserReady

LaserReady is a browser-based vector editor designed specifically for laser cutting and engraving workflows. It allows users to create, import, and edit vector designs, setting specific parameters for cutting, scoring, and engraving.

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

-   Node.js (v16 or higher)
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

### Building for Production

Build the application for production:

```bash
npm run build
```

## Tech Stack

-   **React**: UI Framework
-   **Vite**: Build tool
-   **Tailwind CSS**: Styling
-   **Lucide React**: Icons
-   **Paper.js** (Internal usage for boolean operations)

## License

MIT

## Support

If you find this project useful, please consider supporting the developer by buying them a coffee.

<p align="center">
  <a href="https://www.buymeacoffee.com/eballetbo" target="_blank" rel="noopener noreferrer">
    <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me a Coffee" width="140"/>
  </a>
</p>