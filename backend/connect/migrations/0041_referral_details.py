from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('connect', '0040_gallery_vlog_folder_name'),
    ]

    operations = [
        migrations.AddField(
            model_name='referral',
            name='branch',
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name='referral',
            name='course',
            field=models.CharField(blank=True, max_length=160),
        ),
        migrations.AddField(
            model_name='referral',
            name='referral_student_name',
            field=models.CharField(blank=True, max_length=160),
        ),
        migrations.AddField(
            model_name='referral',
            name='trainer_name',
            field=models.CharField(blank=True, max_length=160),
        ),
    ]
