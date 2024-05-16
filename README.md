## [mainframe](https://pradan.dev/) - `Django - React`
![healthchecks.io](https://healthchecks.io/badge/5a1d5302-e570-47ef-bbbf-50c73b283092/-O8jpQTp.svg)

### initial setup
```shell
rye sync
rye run dev
```

### db backup
#### Individual app data

```shell
python manage.py dumpdata <app_name> --verbosity=2 -o `date +%Y_%m_%d_%H_%M_%S`_<app_name>.json
python manage.py loaddata <dump_name>.json --app=<app_name> --verbosity=2
```

#### Entire database

```shell
pg_dump -U $DB_USER -p $DB_PORT -h $DB_HOST --column-insert --data-only $DB_DATABASE > `date +%Y_%m_%d_%H_%M_%S`_mainframe_dump.sql
psql -U $DB_USER -p $DB_PORT -h $DB_HOST -d $DB_DATABASE < <dump_name>.sql
```
