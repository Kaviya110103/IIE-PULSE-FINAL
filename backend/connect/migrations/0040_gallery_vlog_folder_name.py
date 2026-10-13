from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('connect', '0032_studentcourseenrollment_actual_fee_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='galleryitem',
            name='folder_name',
            field=models.CharField(blank=True, default='General', max_length=200),
        ),
        migrations.AddField(
            model_name='vlogitem',
            name='folder_name',
            field=models.CharField(blank=True, default='General', max_length=200),
        ),
    ]
