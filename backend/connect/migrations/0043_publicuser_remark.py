from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('connect', '0042_publicuser_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='publicuser',
            name='remark',
            field=models.TextField(blank=True, default=''),
        ),
    ]
