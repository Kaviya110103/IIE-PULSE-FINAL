from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('connect', '0044_awarditem'),
    ]

    operations = [
        migrations.AddField(
            model_name='studentchallengeday',
            name='source_session',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='challenge_attempts',
                to='connect.coursesession',
            ),
        ),
        migrations.AddField(
            model_name='studentchallengeday',
            name='attempt_number',
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddIndex(
            model_name='studentchallengeday',
            index=models.Index(
                fields=['challenge', 'source_session', 'attempt_number'],
                name='student_cha_challen_f88f43_idx',
            ),
        ),
    ]
