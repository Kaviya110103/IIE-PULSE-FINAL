from django.db import migrations, models


def classify_existing_quizzes(apps, schema_editor):
    Quiz = apps.get_model('connect', 'Quiz')
    for quiz in Quiz.objects.all().iterator():
        if quiz.batch_id or quiz.created_by_id:
            quiz.quiz_scope = 'staff_batch'
        else:
            quiz.quiz_scope = 'admin_global'
        quiz.save(update_fields=['quiz_scope'])
        if quiz.batch_id:
            quiz.assigned_batches.add(quiz.batch_id)


class Migration(migrations.Migration):
    dependencies = [('connect', '0051_publicuser_follow_up')]

    operations = [
        migrations.AddField(
            model_name='quiz',
            name='quiz_scope',
            field=models.CharField(
                choices=[('admin_global', 'Admin Global Quiz'), ('staff_batch', 'Staff Batch Quiz')],
                default='staff_batch',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='quiz',
            name='assigned_batches',
            field=models.ManyToManyField(
                blank=True,
                db_constraint=False,
                related_name='assigned_quizzes',
                to='connect.batches',
            ),
        ),
        migrations.RunPython(classify_existing_quizzes, migrations.RunPython.noop),
    ]
