from __future__ import print_function

try:
    import http.server as httpserver
    import socketserver
except ImportError:
    import SimpleHTTPServer as httpserver
    import SocketServer as socketserver

PORT = 8000

Handler = httpserver.SimpleHTTPRequestHandler

httpd = socketserver.TCPServer(("", PORT), Handler)

print("serving at port %d" % PORT)
httpd.serve_forever()
