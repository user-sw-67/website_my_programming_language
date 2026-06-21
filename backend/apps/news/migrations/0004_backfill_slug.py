from django.db import migrations
from django.utils.text import slugify

CYRILLIC_TO_LATIN = {
    "a": "a",
}


def transliterate(text):
    table = {
        "а": "a", "б": "b", "в": "v", "г": "g", "д": "d",
        "е": "e", "ё": "e", "ж": "zh", "з": "z", "и": "i",
        "й": "i", "к": "k", "л": "l", "м": "m", "н": "n",
        "о": "o", "п": "p", "р": "r", "с": "s", "т": "t",
        "у": "u", "ф": "f", "х": "h", "ц": "c", "ч": "ch",
        "ш": "sh", "щ": "sch", "ъ": "", "ы": "y", "ь": "",
        "э": "e", "ю": "yu", "я": "ya",
    }
    return "".join(table.get(ch, ch) for ch in text.lower())


def backfill_slugs(apps, schema_editor):
    NewsPost = apps.get_model("news", "NewsPost")
    for post in NewsPost.objects.filter(slug=""):
        base = slugify(transliterate(post.title)) or "news"
        slug = base
        counter = 1
        while NewsPost.objects.filter(slug=slug).exclude(pk=post.pk).exists():
            counter += 1
            slug = f"{base}-{counter}"
        post.slug = slug
        post.save(update_fields=["slug"])


class Migration(migrations.Migration):

    dependencies = [
        ("news", "0003_newspost_slug"),
    ]

    operations = [
        migrations.RunPython(backfill_slugs, migrations.RunPython.noop),
    ]
