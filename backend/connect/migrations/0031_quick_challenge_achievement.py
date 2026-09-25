from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('connect', '0030_challengequestionpool_studentchallenge_and_more'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='studentchallengeday',
            unique_together={('challenge', 'day_number')},
        ),
        migrations.CreateModel(
            name='StudentChallengeAchievement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('badge_code', models.CharField(choices=[('excellent_student', 'Excellent Student')], default='excellent_student', max_length=50)),
                ('badge_title', models.CharField(default='Excellent Student', max_length=100)),
                ('completed_days', models.PositiveIntegerField(default=15)),
                ('final_score_percentage', models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ('calendar_days_taken', models.PositiveIntegerField(default=1)),
                ('completed_at', models.DateTimeField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('batch', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='challenge_achievements', to='connect.batches')),
                ('challenge', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='achievement', to='connect.studentchallenge')),
                ('course', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='challenge_achievements', to='connect.courses')),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='challenge_achievements', to='connect.students')),
            ],
            options={
                'db_table': 'student_challenge_achievements',
                'indexes': [
                    models.Index(fields=['student', 'course', 'batch'], name='student_cha_student_bf4c8d_idx'),
                    models.Index(fields=['challenge'], name='student_cha_challen_35ce42_idx'),
                ],
                'unique_together': {('student', 'course', 'batch', 'challenge')},
            },
        ),
    ]
