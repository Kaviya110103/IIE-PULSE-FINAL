import hashlib
import html
import logging
import re
import xml.etree.ElementTree as ET
from datetime import datetime
from email.utils import parsedate_to_datetime
from urllib.parse import quote_plus

import requests
from django.conf import settings
from django.core.cache import cache
from django.db.models import Q
from django.utils import timezone

from .models import NewsItem
from .serializers import strip_unsupported_mysql_chars

logger = logging.getLogger(__name__)

RSS_CACHE_KEY = 'live_technology_news_last_refresh'
DEFAULT_INTERVAL_SECONDS = 60
MAX_IMPORTED_ITEMS = 30
MAX_STORED_LIVE_ITEMS = 120
NEWS_RETENTION_DAYS = 10

TECH_KEYWORDS = [
    'technology', 'tech', 'software', 'programming', 'developer', 'coding',
    'artificial intelligence', 'ai', 'machine learning', 'cloud', 'cybersecurity',
    'security', 'data', 'robotics', 'startup', 'semiconductor', 'app', 'mobile',
    'internet', 'google', 'microsoft', 'apple', 'amazon', 'meta', 'openai',
]

GOOGLE_NEWS_QUERY = (
    'technology OR software OR artificial intelligence OR cybersecurity '
    'OR cloud computing OR programming'
)


def get_news_refresh_interval_seconds():
    value = getattr(settings, 'NEWS_RSS_INTERVAL_SECONDS', DEFAULT_INTERVAL_SECONDS)
    try:
        return max(45, min(60, int(value)))
    except (TypeError, ValueError):
        return DEFAULT_INTERVAL_SECONDS


def google_news_rss_url():
    query = quote_plus(GOOGLE_NEWS_QUERY)
    return f'https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US:en'


def recent_news_cutoff():
    return timezone.now() - timezone.timedelta(days=NEWS_RETENTION_DAYS)


def clean_html_text(value):
    text = html.unescape(str(value or ''))
    text = text.replace('\ufffd', '-')
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return strip_unsupported_mysql_chars(text)


def extract_image_url(item):
    for child in item:
        tag = child.tag.lower()
        if tag.endswith('content') or tag.endswith('thumbnail'):
            url = child.attrib.get('url') or child.attrib.get('href')
            if url:
                return url

    description = item.findtext('description') or ''
    match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', description, re.I)
    return html.unescape(match.group(1)) if match else ''


def parse_rss_datetime(value):
    if not value:
        return None
    try:
        parsed = parsedate_to_datetime(value)
        if timezone.is_naive(parsed):
            parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
        return parsed
    except (TypeError, ValueError, IndexError, OverflowError):
        return None


def is_technology_news(title, description):
    haystack = f'{title} {description}'.lower()
    return any(keyword in haystack for keyword in TECH_KEYWORDS)


def source_name(item):
    for child in item:
        if child.tag.lower().endswith('source') and child.text:
            return strip_unsupported_mysql_chars(child.text.strip())
    return 'Google News'


def content_hash(title, url, published_at):
    raw = f'{title}|{url}|{published_at.isoformat() if published_at else ""}'
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


def parse_google_news_items(xml_content):
    root = ET.fromstring(xml_content)
    parsed_items = []
    cutoff = recent_news_cutoff()

    for item in root.findall('.//item'):
        title = clean_html_text(item.findtext('title'))
        description = clean_html_text(item.findtext('description'))
        link = (item.findtext('link') or '').strip()
        guid = (item.findtext('guid') or link or title).strip()
        published_at = parse_rss_datetime(item.findtext('pubDate'))

        if published_at and published_at < cutoff:
            continue

        if not title or not link or not is_technology_news(title, description):
            continue

        parsed_items.append({
            'title': title[:200],
            'message': description or title,
            'source': source_name(item)[:150],
            'published_at': published_at,
            'original_url': link[:1000],
            'rss_guid': guid[:500],
            'image_url': extract_image_url(item)[:1000],
            'content_hash': content_hash(title, link, published_at),
            'category': 'Technology',
            'news_type': 'live',
        })

    return sorted(
        parsed_items,
        key=lambda row: row.get('published_at') or timezone.make_aware(datetime.min),
        reverse=True,
    )[:MAX_IMPORTED_ITEMS]


def prune_old_live_news():
    NewsItem.objects.filter(
        news_type='live',
        category='Technology',
        published_at__lt=recent_news_cutoff(),
    ).delete()

    ids_to_keep = list(
        NewsItem.objects.filter(news_type='live', category='Technology')
        .order_by('-published_at', '-created_at')
        .values_list('id', flat=True)[:MAX_STORED_LIVE_ITEMS]
    )
    if ids_to_keep:
        NewsItem.objects.filter(news_type='live', category='Technology').exclude(id__in=ids_to_keep).delete()


def refresh_live_technology_news(force=False):
    interval = get_news_refresh_interval_seconds()
    last_refresh = cache.get(RSS_CACHE_KEY)
    now = timezone.now()

    if not force and last_refresh and (now - last_refresh).total_seconds() < interval:
        return {'refreshed': False, 'created': 0, 'reason': 'interval_not_elapsed'}

    created_count = 0
    try:
        response = requests.get(google_news_rss_url(), timeout=10)
        response.raise_for_status()
        for row in parse_google_news_items(response.content):
            exists = NewsItem.objects.filter(
                Q(original_url=row['original_url']) |
                Q(rss_guid=row['rss_guid']) |
                Q(content_hash=row['content_hash'])
            ).exists()
            if exists:
                continue
            NewsItem.objects.create(**row)
            created_count += 1

        prune_old_live_news()
        cache.set(RSS_CACHE_KEY, now, timeout=interval)
        return {'refreshed': True, 'created': created_count, 'reason': ''}
    except Exception as exc:
        logger.warning('Google News RSS refresh failed: %s', exc, exc_info=True)
        cache.set(RSS_CACHE_KEY, now, timeout=interval)
        return {'refreshed': False, 'created': 0, 'reason': str(exc)}


def live_technology_news_queryset():
    return NewsItem.objects.filter(
        news_type='live',
        category='Technology',
        published_at__gte=recent_news_cutoff(),
    ).order_by('-published_at', '-created_at')
