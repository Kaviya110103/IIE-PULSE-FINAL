from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('connect', '0054_batch_archive_history')]

    operations = [
        migrations.AddField(
            model_name='useractivity',
            name='device_id',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
    ]
