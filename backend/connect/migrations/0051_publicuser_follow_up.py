from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('connect', '0050_publicuser_area_of_interest'),
    ]

    operations = [
        migrations.AlterField(
            model_name='publicuser',
            name='status',
            field=models.CharField(
                choices=[
                    ('new', 'New'),
                    ('walked_in', 'Walked In'),
                    ('follow_up', 'Follow Up'),
                ],
                default='new',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='publicuser',
            name='follow_up_specification',
            field=models.CharField(blank=True, default='', max_length=160),
        ),
        migrations.AddField(
            model_name='publicuser',
            name='follow_up_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='publicuser',
            name='follow_up_feedback',
            field=models.CharField(
                blank=True,
                choices=[
                    ('will_enroll', 'Will Enroll'),
                    ('not_interested', 'Not Interested'),
                    ('joined_another_institute', 'Joined in Another Institute'),
                ],
                default='',
                max_length=40,
            ),
        ),
        migrations.AddField(
            model_name='publicuser',
            name='follow_up_created_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
