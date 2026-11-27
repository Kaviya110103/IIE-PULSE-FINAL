from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('connect', '0061_alter_sessionnotification_notification_type')]

    operations = [
        migrations.AlterUniqueTogether(name='testresult', unique_together=set()),
        migrations.AddField(
            model_name='testresult',
            name='assignment',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='results', to='connect.assignedtest'),
        ),
    ]
