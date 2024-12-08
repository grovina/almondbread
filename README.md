# Mandelbrot-like Sequence Explorer

An interactive visualization tool for exploring sequences of the form z_{n+1} = z_n² + c, which generate the Mandelbrot set when starting with z₀ = 0.

## Features

- Interactive complex plane visualization
- Click to explore individual points
- Grid mode for exploring multiple points at once
- Real-time sequence computation and visualization
- Adjustable parameters:
  - Initial value (z₀)
  - Maximum iterations
  - Grid size

## Installation

1. Make sure you have Python 3.9 or later installed
2. Install Poetry (package manager):
   ```bash
   curl -sSL https://install.python-poetry.org | python3 -
   ```

3. Clone this repository:
   ```bash
   git clone <repository-url>
   cd mandelbrot-explorer
   ```

4. Install dependencies:
   ```bash
   poetry install
   ```

## Running the Application

1. Activate the Poetry environment:
   ```bash
   poetry shell
   ```

2. Run the Bokeh server:
   ```bash
   bokeh serve mandelbrot_explorer/main.py --show
   ```

The application will open in your default web browser at `http://localhost:5006/main`.

## Usage

### Basic Controls
- **Click** on the complex plane to analyze a single point
- **Zoom** using the mouse wheel or zoom tools
- **Pan** by clicking and dragging
- **Reset** the view using the reset tool

### Grid Mode
1. Check the "Grid Mode" checkbox
2. Set the desired grid size (points per side)
3. Click anywhere on the plot to generate a grid of points centered at that location

### Parameters
- **Initial z₀:** Set the starting point for the sequence (default: 0 + 0i)
- **Max Iterations:** Maximum number of iterations to compute (default: 100)
- **Grid Size:** Number of points per side in grid mode (default: 11)

### Color Coding
- **Blue points:** Sequence converges (|z| ≤ 2)
- **Red points:** Sequence diverges (|z| > 2)

## Development

The project uses Poetry for dependency management. To set up a development environment:

1. Install development dependencies:
   ```bash
   poetry install
   ```

2. Run tests (if available):
   ```bash
   poetry run pytest
   ```

## License

[Your chosen license]

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 