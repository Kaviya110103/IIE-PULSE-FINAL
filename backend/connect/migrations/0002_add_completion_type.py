from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('connect', '0001_initial'),
    ]

    # completion_type is already present in 0001_initial.py. Keeping this
    # migration as a no-op preserves the migration graph while allowing a fresh
    # MySQL test database to replay migrations without adding the column twice.
    operations = []
