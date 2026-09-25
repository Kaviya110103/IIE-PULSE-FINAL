from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('connect', '0028_batch_code'),
    ]

    operations = [
        migrations.AddField(
            model_name='newsitem',
            name='category',
            field=models.CharField(blank=True, default='Technology', max_length=50),
        ),
        migrations.AddField(
            model_name='newsitem',
            name='content_hash',
            field=models.CharField(blank=True, default='', max_length=64),
        ),
        migrations.AddField(
            model_name='newsitem',
            name='image_url',
            field=models.URLField(blank=True, default='', max_length=1000),
        ),
        migrations.AddField(
            model_name='newsitem',
            name='news_type',
            field=models.CharField(blank=True, default='manual', max_length=20),
        ),
        migrations.AddField(
            model_name='newsitem',
            name='original_url',
            field=models.URLField(blank=True, default='', max_length=1000),
        ),
        migrations.AddField(
            model_name='newsitem',
            name='published_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='newsitem',
            name='rss_guid',
            field=models.CharField(blank=True, default='', max_length=500),
        ),
        migrations.AddField(
            model_name='newsitem',
            name='source',
            field=models.CharField(blank=True, default='', max_length=150),
        ),
    ]
