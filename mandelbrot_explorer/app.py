from bokeh.server.server import Server

from .core import main


def run_app(port=5006):
    server = Server({'/': main}, port=port, allow_websocket_origin=[f"localhost:{port}"])
    server.start()
    server.io_loop.start()

if __name__ == '__main__':
    run_app() 