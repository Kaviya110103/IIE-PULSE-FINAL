from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('connect', '0052_quiz_scope_and_batch_assignments'),
    ]

    operations = [
        migrations.AddField(
            model_name='publicuser',
            name='source',
            field=models.CharField(
                blank=True,
                choices=[
                    ('google', 'Google'),
                    ('facebook', 'Facebook'),
                    ('instagram', 'Instagram'),
                    ('linkedin', 'LinkedIn'),
                    ('friends', 'Friends'),
                    ('others', 'Others'),
                ],
                default='',
                max_length=30,
            ),
        ),
    ]
