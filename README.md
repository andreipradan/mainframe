## [mainframe](https://pradan.dev/) - `Django - React`
<img alt="healthchecks.io status" src="https://healthchecks.io/badge/5a1d5302-e570-47ef-bbbf-50c73b283092/-O8jpQTp.svg" />

### db backup
```shell
 python manage.py dumpdata <app_name> --verbosity=2 -o `date +%Y_%m_%d_%H_%M_%S`_<app_name>.json
```

### db restore
```shell
python manage.py loaddata <dump_name>.json --app=<app_name> --verbosity=2
```
