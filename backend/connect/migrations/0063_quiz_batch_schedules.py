from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('connect', '0062_testresult_retest')]
    operations = [migrations.AddField(model_name='quiz', name='batch_schedules', field=models.JSONField(default=dict, blank=True))]
