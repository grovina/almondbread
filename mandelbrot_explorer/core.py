# Configure logging (optional)
import logging
import os

import numpy as np
from bokeh.events import Tap
from bokeh.layouts import column, row
from bokeh.models import (
    Button,
    CheckboxGroup,
    ColumnDataSource,
    Div,
    HoverTool,
    Spinner,
    TextInput,
)
from bokeh.models.widgets import Panel, Tabs
from bokeh.plotting import curdoc, figure
from bokeh.themes import Theme

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Styling constants
PLOT_WIDTH = 800
PLOT_HEIGHT = 600
CONTROL_WIDTH = 250
THEME = {
    'font': 'Inter',
    'background': '#ffffff',
    'border': '#e2e8f0',
    'text': '#1e293b',
    'grid': '#f1f5f9',
    'primary': '#3b82f6',
    'danger': '#ef4444'
}

# Colors and styles (using Nord theme)
COLORS = {
    'diverge': '#BF616A',  # Nord11 - red
    'converge': '#88C0D0',  # Nord8 - blue
    'background': '#2E3440',  # Nord0 - darkest
    'grid': '#4C566A'  # Nord3 - gray
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
        title="Mandelbrot Explorer",
        tools="pan,wheel_zoom,box_zoom,reset,save",
        x_range=(-2, 0.5), y_range=(-1.25, 1.25),
        width=PLOT_WIDTH,  # Use fixed width
        height=PLOT_HEIGHT,  # Use fixed height
        toolbar_location="above"
    )

    # Style the plot (these will be overridden by theme.yaml if present)
    plot.background_fill_color = '#2E3440'
    plot.border_fill_color = '#2E3440'
    plot.grid.grid_line_color = '#4C566A'
    plot.grid.grid_line_alpha = 0.3
    plot.grid.grid_line_dash = [6, 4]
    plot.axis.axis_label_text_font_size = '14px'
    plot.axis.axis_label_text_font_style = 'bold'
    plot.border_fill_color = None
    plot.outline_line_color = '#4C566A'

    # Simpler hover tool configuration
    hover = HoverTool(
        tooltips=[
            ('Point', '(@x{0.000}, @y{0.000})'),
            ('Behavior', '@behavior'),
            ('Sequence', '@sequence{safe}')
        ],
        mode='mouse',
        point_policy='snap_to_data',
        attachment='horizontal'
    )
    plot.add_tools(hover)

    return plot

def create_controls():
    # Create input controls
    z0_real = TextInput(
        title="Initial z₀ (Real Part):", 
        value="0", 
        width=CONTROL_WIDTH,
        placeholder="e.g., 0.0"
    )
    z0_imag = TextInput(
        title="Initial z₀ (Imaginary Part):", 
        value="0", 
        width=CONTROL_WIDTH,
        placeholder="e.g., 0.0"
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
    clicked_source = ColumnDataSource(data=dict(
        x=[], 
        y=[], 
        color=[], 
        behavior=[],
        sequence=[]  # Add sequence column
    ))
    plot.circle('x', 'y', source=clicked_source, size=10, color='color')
    
    # Unpack individual controls from create_controls
    z0_real, z0_imag, max_iter_input, grid_mode, grid_size_input, clear_button = create_controls()
    
    # Create outputs
    sequence_output, status_div = create_outputs()
    
    def clear_points():
        clicked_source.data = dict(x=[], y=[], color=[], behavior=[], sequence=[])
        sequence_output.text = "Click on the plot to explore the sequence!"
    
    clear_button.on_click(clear_points)
    
    def add_grid(center_x, center_y):
        status_div.text = "Calculating grid points..."
        loading_spinner.text = "<div class='loader'></div>"
        
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
        
        # Add behavior column for grid points
        behaviors = ['Converges' if color == COLORS['converge'] else 'Diverges' 
                    for color in colors]
        
        new_clicked = dict(
            x=points_x, 
            y=points_y, 
            color=colors,
            behavior=behaviors,
            sequence=[""] * len(points_x)  # Empty sequences for grid points
        )
        clicked_source.stream(new_clicked)
        
        status_div.text = f"Added {len(points_x)} points to the plot"
        loading_spinner.text = ""
    
    def on_tap(event):
        loading_spinner.text = "<div class='loader'></div>"
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
            
            # Generate sequence text first
            sequence_text = [
                f"Point clicked: c = {c:.3f}",
                f"Behavior: {behavior.upper()}",
                "",
                "Sequence:",
                "─" * 40
            ]
            for i, z in enumerate(sequence):
                sequence_text.append(f"z_{i:<2} = {z.real:>8.3f} + {z.imag:>8.3f}i")
            
            color = COLORS['diverge'] if behavior == 'diverges' else COLORS['converge']
            sequence_str = "\n".join(sequence_text)  # Now sequence_text is defined
            new_clicked = dict(
                x=[c_real], 
                y=[c_imag], 
                color=[color], 
                behavior=[behavior.capitalize()],
                sequence=[sequence_str]
            )
            clicked_source.stream(new_clicked)
            
            sequence_output.text = f"""
            <h3>Point Analysis</h3>
            <p><strong>Clicked Point:</strong> c = {c_real:.3f} + {c_imag:.3f}i</p>
            <p><strong>Behavior:</strong> {behavior.capitalize()}</p>
            <h4>Sequence:</h4>
            <pre>{'<br>'.join(sequence_text)}</pre>
            """
            
        except Exception as e:
            logger.error(f"Error processing click: {str(e)}")
            sequence_output.text = f"Error: {str(e)}"
        finally:
            loading_spinner.text = ""
    
    plot.on_event(Tap, on_tap)
    
    # Assemble control_panel within initialize
    control_panel = column(
        Div(text="<h3>Parameters</h3>"),
        column(z0_real, z0_imag),
        column(max_iter_input),
        Div(text="<h3>Grid Options</h3>"),
        column(grid_mode, grid_size_input),
        column(clear_button),
        width=CONTROL_WIDTH,
        css_classes=['control-panel']
    )
    
    loading_spinner = Div(
        text="",
        css_classes=['loading-spinner']
    )
    
    # Create layout with proper sizing
    layout = column(
        row(
            control_panel,
            plot,
            sizing_mode='stretch_width'  # Changed from 'fixed'
        ),
        status_div,
        loading_spinner,
        sequence_output,
        sizing_mode='stretch_width',  # Changed from 'stretch_both'
        width=PLOT_WIDTH + CONTROL_WIDTH + 50,
        height=PLOT_HEIGHT + 400  # Add space for status and sequence output
    )
    
    return layout 