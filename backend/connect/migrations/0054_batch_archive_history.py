from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('connect', '0053_publicuser_source'),
    ]

    operations = [
        migrations.AddField(
            model_name='batches',
            name='is_archived',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='batches',
            name='archived_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
