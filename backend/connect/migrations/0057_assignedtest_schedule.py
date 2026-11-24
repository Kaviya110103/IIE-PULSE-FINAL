from django.db import migrations, models
from django.db.models import Count


def collapse_duplicate_assignments(apps, schema_editor):
    AssignedTest = apps.get_model('connect', 'AssignedTest')
    duplicate_pairs = (
        AssignedTest.objects.values('test_id', 'batch_id')
        .annotate(row_count=Count('id'))
        .filter(row_count__gt=1)
    )
    for pair in duplicate_pairs:
        rows = AssignedTest.objects.filter(
            test_id=pair['test_id'], batch_id=pair['batch_id']
        ).order_by('-assigned_date', '-id')
        keep = rows.first()
        rows.exclude(id=keep.id).delete()


class Migration(migrations.Migration):
    dependencies = [('connect', '0056_prefix_existing_student_ids')]

    operations = [
        migrations.AddField(
            model_name='assignedtest',
            name='end_time',
            field=models.TimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='assignedtest',
            name='start_time',
            field=models.TimeField(blank=True, null=True),
        ),
        migrations.RunPython(collapse_duplicate_assignments, migrations.RunPython.noop),
        migrations.AlterUniqueTogether(
            name='assignedtest',
            unique_together={('test', 'batch')},
        ),
    ]
