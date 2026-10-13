from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('connect', '0041_referral_details'),
    ]

    operations = [
        migrations.AddField(
            model_name='publicuser',
            name='status',
            field=models.CharField(
                choices=[('new', 'New'), ('walked_in', 'Walked In')],
                default='new',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='publicuser',
            name='status_updated_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
