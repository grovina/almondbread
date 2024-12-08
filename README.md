# Mandelbrot Explorer

An interactive visualization tool for exploring sequences of the form z_{n+1} = z_n² + c, which generate the Mandelbrot set when starting with z₀ = 0.

![Mandelbrot Explorer Screenshot](./screenshot.png)

## Features

- Interactive complex plane visualization with D3.js
- Real-time sequence computation and visualization
- Dynamic grid mode for exploring multiple points
- Detailed sequence analysis with step-by-step visualization
- Modern, responsive UI with intuitive controls
- Zoom and pan capabilities

## Technology Stack

- React 18 with TypeScript
- D3.js for visualization
- Vite for build tooling
- CSS Variables for theming

## Getting Started

### Prerequisites

- Node.js 16 or later
- Yarn 3.x

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/grovina/almondbread.git
   cd almondbread
   ```

2. Enable Corepack (required for Yarn 3):

   ```bash
   corepack enable
   ```

3. Install dependencies:

   ```bash
   yarn install
   ```

   If you encounter a yarn-path error, run:

   ```bash
   yarn set version stable
   yarn install
   ```

4. Start the development server:

   ```bash
   yarn dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

## Usage

### Basic Controls

- **Click** anywhere on the plot to analyze that point
- **Zoom** using the mouse wheel or zoom buttons
- **Pan** by clicking and dragging
- **Reset** view using the reset button

### Grid Mode

1. Click the grid icon in the toolbar to enable grid mode
2. Adjust grid size and spacing in the parameters panel
3. Click a point to generate a grid centered at that location

### Parameters

- **Initial z₀:** Set the starting point for the sequence (default: 0 + 0i)
- **Max Iterations:** Maximum number of iterations to compute
- **Grid Size:** Number of points per side in grid mode
- **Grid Spacing:** Distance between grid points

### Analysis

The sequence panel shows:

- Point coordinates in complex form
- Convergence/divergence status
- Step-by-step sequence visualization
- Final magnitude and escape time (if applicable)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT License](LICENSE)

## Acknowledgments

- Inspired by the mathematical beauty of the Mandelbrot set
- Built with modern web technologies
- UI design inspired by mathematical visualization tools
