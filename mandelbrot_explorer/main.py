from bokeh.layouts import column
from bokeh.plotting import curdoc

from mandelbrot_explorer.core import initialize


def main(doc=None):
    doc = doc or curdoc()
    layout = initialize()
    doc.add_root(layout)
    doc.title = "Mandelbrot Explorer"

# This is needed for bokeh serve
main(curdoc())
