import os
from django.core.management.base import BaseCommand, CommandError
from django.core.management import call_command
from django.apps import apps
from django.conf import settings
from django.db import connection


class Command(BaseCommand):
    help = (
        "Wipe all tables from the database, then optionally run makemigrations and migrate. "
        "Only available when DEBUG=True."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--yes",
            action="store_true",
            default=False,
            help="Skip all confirmation prompts.",
        )
        parser.add_argument(
            "--makemigrations",
            action="store_true",
            default=False,
            help="Automatically run makemigrations after wiping without prompting.",
        )
        parser.add_argument(
            "--migrate",
            action="store_true",
            default=False,
            help="Automatically run migrate after wiping without prompting.",
        )

    def _get_tables(self):
        """Return a sorted list of all tables in the database."""
        return sorted(connection.introspection.table_names())

    def _drop_tables_postgresql(self, tables):
        """Drop all tables using PostgreSQL CASCADE."""
        with connection.cursor() as cursor:
            cursor.execute("SET session_replication_role = 'replica';")
            for table in tables:
                cursor.execute(f'DROP TABLE IF EXISTS "{table}" CASCADE;')
            cursor.execute("SET session_replication_role = 'origin';")

    def _drop_tables_sqlite(self, tables):
        """Drop all tables for SQLite."""
        with connection.cursor() as cursor:
            cursor.execute("PRAGMA foreign_keys = OFF;")
            for table in tables:
                cursor.execute(f'DROP TABLE IF EXISTS "{table}";')
            cursor.execute("PRAGMA foreign_keys = ON;")

    def _drop_tables_mysql(self, tables):
        """Drop all tables for MySQL/MariaDB."""
        with connection.cursor() as cursor:
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
            for table in tables:
                cursor.execute(f"DROP TABLE IF EXISTS `{table}`;")
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")

    def _drop_tables(self, tables):
        """Route to the correct drop method based on the database vendor."""
        vendor = connection.vendor

        drop_methods = {
            "postgresql": self._drop_tables_postgresql,
            "sqlite": self._drop_tables_sqlite,
            "mysql": self._drop_tables_mysql,
        }

        drop_method = drop_methods.get(vendor)
        if drop_method is None:
            raise CommandError(
                f"Unsupported database vendor: '{vendor}'. "
                f"Supported: {', '.join(drop_methods.keys())}."
            )

        drop_method(tables)

    def _confirm(self, message):
        """Prompt the user for confirmation. Returns True if confirmed."""
        confirm = input(f"  {message} [y/N]: ")
        self.stdout.write("")
        return confirm.strip().lower() == "y"

    def handle(self, *args, **options):
        # Guard: never run in production
        if not settings.DEBUG:
            raise CommandError(
                "🚫 This command is disabled when DEBUG=False. "
                "It is only intended for development environments."
            )

        auto_confirm = options["yes"]
        auto_makemigrations = options["makemigrations"]
        auto_migrate = options["migrate"]

        db_name = connection.settings_dict.get("NAME", "unknown")
        db_vendor = connection.vendor

        # Step 1: discover tables
        tables = self._get_tables()

        if not tables:
            self.stdout.write("")
            self.stdout.write("  No tables found in the database. Nothing to do.")
            self.stdout.write("")
            return

        # Step 2: preview tables
        self.stdout.write("")
        self.stdout.write(
            self.style.ERROR("  ╔══════════════════════════════════════════════╗")
        )
        self.stdout.write(
            self.style.ERROR("  ║         ⚠️  DESTRUCTIVE OPERATION ⚠️           ║")
        )
        self.stdout.write(
            self.style.ERROR("  ╚══════════════════════════════════════════════╝")
        )
        self.stdout.write("")
        self.stdout.write(f"  Database: {self.style.WARNING(str(db_name))}")
        self.stdout.write(f"  Vendor:   {self.style.WARNING(db_vendor)}")
        self.stdout.write(f"  Tables:   {self.style.WARNING(str(len(tables)))}")
        self.stdout.write("")

        for table in tables:
            self.stdout.write(self.style.WARNING(f"     ⚠️  {table}"))

        self.stdout.write("")

        # Step 3: confirmation
        if not auto_confirm:
            self.stdout.write(
                self.style.ERROR(
                    "  ⛔ This will permanently destroy ALL data in the above tables. Use manage.py flush instead if you want to keep tables but wipe data. ⛔"
                )
            )
            self.stdout.write("")

            if not self._confirm("Type 'y' to confirm you want to wipe the database:"):
                self.stdout.write("  Aborted.")
                self.stdout.write("")
                return

        # Step 4: drop tables
        self.stdout.write(f"  🗑️  Dropping {len(tables)} table(s)...")
        self.stdout.write("")

        try:
            self._drop_tables(tables)
        except Exception as e:
            raise CommandError(f"Failed to drop tables: {e}")

        for table in tables:
            self.stdout.write(self.style.ERROR(f"  ❌ Dropped: {table}"))

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"  ✅ Successfully dropped {len(tables)} table(s)."
            )
        )
        self.stdout.write("")

        # Step 5: verify tables are gone
        remaining = self._get_tables()
        if remaining:
            self.stdout.write(
                self.style.WARNING(
                    f"  ⚠️  {len(remaining)} table(s) remain (may be system tables):"
                )
            )
            for table in remaining:
                self.stdout.write(self.style.WARNING(f"     ⚠️  {table}"))
            self.stdout.write("")

        # Step 6: optionally run makemigrations
        run_makemigrations = auto_makemigrations

        if not run_makemigrations and not auto_confirm:
            run_makemigrations = self._confirm(
                "Would you like to run makemigrations now?"
            )

        if run_makemigrations:
            self.stdout.write("  🔄 Running makemigrations...")
            self.stdout.write("")

            try:
                call_command(
                    "makemigrations",
                    stdout=self.stdout,
                    stderr=self.stderr,
                )
            except Exception as e:
                self.stdout.write("")
                self.stdout.write(
                    self.style.ERROR(f"  ❌ makemigrations failed: {e}")
                )
                self.stdout.write("")
                return

            self.stdout.write("")
            self.stdout.write(
                self.style.SUCCESS("  ✅ makemigrations completed successfully.")
            )
            self.stdout.write("")

        # Step 7: optionally run migrate
        run_migrate = auto_migrate

        if not run_migrate and not auto_confirm:
            run_migrate = self._confirm("Would you like to run migrate now?")

        if run_migrate:
            self.stdout.write("  🔄 Running migrate...")
            self.stdout.write("")

            try:
                call_command(
                    "migrate",
                    stdout=self.stdout,
                    stderr=self.stderr,
                )
            except Exception as e:
                self.stdout.write("")
                self.stdout.write(
                    self.style.ERROR(f"  ❌ migrate failed: {e}")
                )
                self.stdout.write("")
                return

            self.stdout.write("")
            self.stdout.write(
                self.style.SUCCESS("  ✅ migrate completed successfully.")
            )
            self.stdout.write("")

        # Final summary
        self.stdout.write(
            self.style.SUCCESS("  🎉 Database wipe complete. Have a nice day!")
        )
        self.stdout.write("")