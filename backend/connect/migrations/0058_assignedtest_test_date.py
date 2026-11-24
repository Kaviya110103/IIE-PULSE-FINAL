from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('connect', '0057_assignedtest_schedule')]

    operations = [
        migrations.AddField(
            model_name='assignedtest',
            name='test_date',
            field=models.DateField(blank=True, null=True),
        ),
    ]
