import multiprocessing

chdir = "/app"
log_file = "-"
max_requests = 1000
max_requests_jitter = 50
workers = multiprocessing.cpu_count() * 2 + 1
wsgi_app = "mainframe.core.wsgi:application"
