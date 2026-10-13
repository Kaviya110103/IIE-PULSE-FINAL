from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('connect', '0045_session_based_daily_activity'),
    ]

    operations = [
        migrations.AddField(
            model_name='testresult',
            name='submission_file',
            field=models.FileField(blank=True, null=True, upload_to='technical_test_submissions/'),
        ),
        migrations.AddField(
            model_name='testresult',
            name='manual_mark',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='testresult',
            name='max_marks',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='testresult',
            name='evaluated_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='evaluated_test_results', to='connect.employee'),
        ),
        migrations.AddField(
            model_name='testresult',
            name='evaluated_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
