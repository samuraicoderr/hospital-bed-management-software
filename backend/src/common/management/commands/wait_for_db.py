import time
from django.db import connections
from django.db.utils import OperationalError
from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'Wait for the database to be available.'

    def handle(self, *args, **options):
        max_retries = 30
        retry_delay = 2

        self.stdout.write("⏳ Waiting for database...")

        for attempt in range(max_retries):
            try:
                connections['default'].ensure_connection()
                self.stdout.write(self.style.SUCCESS("✅ Database is available!"))
                return
            except OperationalError as e:
                self.stdout.write(f"⚠️ Attempt {attempt+1}/{max_retries} - DB unavailable: {str(e)}")
                time.sleep(retry_delay)

        self.stderr.write(self.style.ERROR("❌ Could not connect to DB after retries"))
        raise SystemExit(1)
