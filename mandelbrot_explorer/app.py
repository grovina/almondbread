# Configure logging (optional)
import logging

import numpy as np
from bokeh.events import Tap
from bokeh.layouts import column, row
from bokeh.models import Button, CheckboxGroup, ColumnDataSource, Div, TextInput
from bokeh.plotting import curdoc, figure

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Styling constants
PLOT_WIDTH = 800
PLOT_HEIGHT = 600
CONTROL_WIDTH = 250
THEME = {
    'font': 'Helvetica Neue',
    'title_font': 'Helvetica Neue',
    'background': '#ffffff',
    'border': '#e9ecef',
    'text': '#2c3e50',
    'grid': '#f8f9fa',
    'primary': '#007bff',
    'danger': '#dc3545'
}

# Colors and styles
COLORS = {
    'diverge': '#ff4757',  # A softer red
    'converge': '#2e86de',  # A softer blue
    'background': '#FFFFFF',  # White
    'grid': '#f8f9fa'       # Light grey
}

def compute_sequence(z0, c, max_iter):
    z = z0
    trajectory = [z]
    for _ in range(max_iter):
        z = z * z + c
        trajectory.append(z)
        if abs(z) > 2:  # Divergence threshold
            return trajectory, 'diverges'
    return trajectory, 'converges'

def compute_grid_points(xx, yy, z0, max_iter):
    # Convert grid points to complex numbers
    c = xx.flatten() + 1j * yy.flatten()
    
    # Initialize z array
    z = np.full_like(c, z0)
    
    # Initialize mask for points that haven't diverged
    not_diverged = np.ones(c.shape, dtype=bool)
    colors = np.full(c.shape, COLORS['converge'])
    
    # Iterate
    for _ in range(max_iter):
        # Only compute for points that haven't diverged
        mask = not_diverged
        z[mask] = z[mask] * z[mask] + c[mask]
        
        # Update divergence status
        diverged = np.abs(z) > 2
        newly_diverged = diverged & not_diverged
        not_diverged &= ~diverged
        
        # Mark newly diverged points
        colors[newly_diverged] = COLORS['diverge']
    
    return xx.flatten(), yy.flatten(), colors

def create_plot():
    # Create a new plot with a title and axis labels
    plot = figure(
        title="Interactive Mandelbrot-like Sequence Explorer",
        tools="pan,wheel_zoom,reset,save",
        x_range=(-1.5, 0.5), y_range=(-1, 1),
        plot_width=PLOT_WIDTH, plot_height=PLOT_HEIGHT,
        output_backend="webgl"
    )

    # Style the plot
    plot.title.text_font_size = '24px'
    plot.title.text_font_style = 'normal'
    plot.title.text_font_weight = 'bold'
    plot.title.text_font = THEME['title_font']
    plot.title.text_color = THEME['text']
    plot.background_fill_color = COLORS['background']
    plot.grid.grid_line_color = COLORS['grid']
    plot.grid.grid_line_alpha = 0.5
    plot.axis.axis_label_text_font_size = '14px'
    plot.axis.axis_label_text_font_weight = 'bold'
    plot.axis.axis_label_text_color = THEME['text']
    plot.border_fill_color = None
    plot.outline_line_color = None

    return plot

def create_controls():
    # Create input controls
    z0_real = TextInput(
        title="Initial z₀ (Real Part):", 
        value="0", 
        width=CONTROL_WIDTH, 
        margin=[5, 0]
    )
    z0_imag = TextInput(
        title="Initial z₀ (Imaginary Part):", 
        value="0", 
        width=CONTROL_WIDTH, 
        margin=[5, 0]
    )
    max_iter_input = TextInput(
        title="Max Iterations:", 
        value="100", 
        width=CONTROL_WIDTH, 
        margin=[5, 0]
    )
    grid_mode = CheckboxGroup(
        labels=["Grid Mode"], 
        active=[], 
        margin=[5, 0, 5, 0]
    )
    grid_size_input = TextInput(
        title="Grid Size (points per side):",
        value="11",
        width=CONTROL_WIDTH,
        margin=[5, 0]
    )
    clear_button = Button(
        label="Clear Points", 
        button_type="danger", 
        width=CONTROL_WIDTH
    )
    
    return z0_real, z0_imag, max_iter_input, grid_mode, grid_size_input, clear_button

def create_outputs():
    # Create output elements
    sequence_output = Div(
        text="Click on the plot to explore the sequence!", 
        width=PLOT_WIDTH, 
        height=200,
        css_classes=['sequence-output']
    )
    
    status_div = Div(
        text="",
        width=PLOT_WIDTH,
        css_classes=['status-message']
    )
    
    return sequence_output, status_div

def initialize():
    # Create plot and data source
    plot = create_plot()
    clicked_source = ColumnDataSource(data=dict(x=[], y=[], color=[]))
    plot.circle('x', 'y', source=clicked_source, size=10, color='color')
    
    # Create controls and outputs
    controls = create_controls()
    z0_real, z0_imag, max_iter_input, grid_mode, grid_size_input, clear_button = controls
    sequence_output, status_div = create_outputs()
    
    def clear_points():
        clicked_source.data = dict(x=[], y=[], color=[])
        sequence_output.text = "Click on the plot to explore the sequence!"
    
    clear_button.on_click(clear_points)
    
    def add_grid(center_x, center_y):
        status_div.text = "Calculating grid points..."
        
        x_range = plot.x_range.end - plot.x_range.start
        y_range = plot.y_range.end - plot.y_range.start
        grid_size_x = x_range * 0.2
        grid_size_y = y_range * 0.2
        
        n_points = int(grid_size_input.value)
        x = np.linspace(center_x - grid_size_x, center_x + grid_size_x, n_points)
        y = np.linspace(center_y - grid_size_y, center_y + grid_size_y, n_points)
        xx, yy = np.meshgrid(x, y)
        
        z0 = complex(float(z0_real.value) or 0, float(z0_imag.value) or 0)
        max_iter = int(max_iter_input.value) or 10
        
        points_x, points_y, colors = compute_grid_points(xx, yy, z0, max_iter)
        
        new_clicked = dict(x=points_x, y=points_y, color=colors)
        clicked_source.stream(new_clicked)
        
        status_div.text = f"Added {len(points_x)} points to the plot"
    
    def on_tap(event):
        try:
            c_real = event.x
            c_imag = event.y
            logger.info(f"Clicked point: c = {c_real} + {c_imag}j")
            
            if 0 in grid_mode.active:
                add_grid(c_real, c_imag)
                return
            
            c = complex(c_real, c_imag)
            z0 = complex(float(z0_real.value) or 0, float(z0_imag.value) or 0)
            max_iter = int(max_iter_input.value) or 100
            sequence, behavior = compute_sequence(z0, c, max_iter)
            
            logger.info(f"Sequence behavior: {behavior}")
            
            color = COLORS['diverge'] if behavior == 'diverges' else COLORS['converge']
            new_clicked = dict(x=[c_real], y=[c_imag], color=[color])
            clicked_source.stream(new_clicked)
            
            sequence_text = [
                f"Point clicked: c = {c:.3f}",
                f"Behavior: {behavior.upper()}",
                "",
                "Sequence:",
                "─" * 40
            ]
            for i, z in enumerate(sequence):
                sequence_text.append(f"z_{i:<2} = {z.real:>8.3f} + {z.imag:>8.3f}i")
            
            sequence_output.text = "\n".join(sequence_text)
            
        except Exception as e:
            logger.error(f"Error processing click: {str(e)}")
            sequence_output.text = f"Error: {str(e)}"
    
    plot.on_event(Tap, on_tap)
    
    # Create layout
    input_controls = column(
        z0_real, 
        z0_imag, 
        max_iter_input, 
        grid_mode, 
        grid_size_input, 
        clear_button,
        width=CONTROL_WIDTH,
        margin=(0, 20, 0, 0),
        css_classes=['control-panel']
    )
    
    layout = column(
        row(input_controls, plot),
        status_div,
        sequence_output,
        margin=(10, 10, 10, 10)
    )
    
    return layout

def main():
    layout = initialize()
    doc = curdoc()
    doc.add_root(layout)
    doc.title = "Mandelbrot Explorer"

if __name__ == '__main__':
    main() 