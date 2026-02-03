chdir = "/app"
log_file = "-"
# Reduce workers to lower memory footprint on small Cloud Run instances.
# Use threaded worker class so the app is loaded once and threads handle concurrency.
workers = 1
worker_class = "gthread"
threads = 4
# Recycle workers more frequently to mitigate leaks
max_requests = 100
max_requests_jitter = 20
wsgi_app = "mainframe.core.wsgi:application"
