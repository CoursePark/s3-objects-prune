# s3-objects-prune

Prune objects in a S3 bucket. Intended to keep backups reasonable.

## Usage

Typically this image is instantiated as a container among many others and would have the responsibility of pruning objects from an S3 bucket in a scenario where objects are regularly created in that bucket. Like backups pruning.

`bluedrop360/postgres-dump-to-s3` could be used to hourly create backups in the format `YYYY-MM-DDTHH:mm` (like _2017-04-19T21:00_) and this can reduce them using a logarithmic formula for pruning, older backups becoming increasingly sparse, but always keeping some.

`MAX_OBJECTS` sets the number of objects to keep.

It is ok to rerun this frequently, it is consistent and will not delete more than it should.

With a `docker-compose` set up, this might look like the following:

`docker-compose.prod.yml` defines a service:

```
  postgres-drop-restore:
    image: bluedrop360/postgres-drop-restore
    environment:
        AWS_ACCESS_KEY_ID: ___
        AWS_SECRET_ACCESS_KEY: ___
        AWS_BUCKET: ___
        AWS_REGION: s3
        CRON_HOUR: 6
        CRON_MINUTE: 0
        MAX_OBJECTS: 20
        PRUNE_POSTFIX: ___ typically the extension, something like .dump or .rdb.gz
        PRUNE_PREFIX: ___ # can be empty or a path to a list of objects
    restart: always
```

The above able will run at 06:00 each day. Each time it will delete objects until there are 20 that match the time stamp pattern. Nothing will happen if there are less than that. The process is very quick, taking only seconds.

***Note**: the usual cron tricks apply to the hour and minute env values. For instance setting `CRON_HOUR` to `*/4` and `CRON_MINUTE` to `0`, will trigger once every 4 hours.*
