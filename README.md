## [mainframe](https://pradan.dev/) - `Django - React`
<img alt="healthchecks.io status" src="https://healthchecks.io/badge/5a1d5302-e570-47ef-bbbf-50c73b283092/-O8jpQTp.svg" />

### db backup
#### Individual app data

```shell
python manage.py dumpdata <app_name> --verbosity=2 -o `date +%Y_%m_%d_%H_%M_%S`_<app_name>.json
python manage.py loaddata <dump_name>.json --app=<app_name> --verbosity=2
```

#### Entire database

```shell
python manage.py db_backup
psql -U $DB_USER -p $DB_PORT -h $DB_HOST -d $DB_DATABASE < <dump_name>.sql
```
