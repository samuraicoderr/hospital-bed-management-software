import os
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from django.core.management import call_command
from django.apps import apps
from django.conf import settings


class Command(BaseCommand):
    help = "Delete migration files for one or more Django apps (except __init__.py)."

    def add_arguments(self, parser):
        parser.add_argument(
            "apps",
            nargs="*",
            type=str,
            help="List of Django app names whose migrations you want to delete. If omitted, uses default apps from settings.MY_APPS.",
        )
        parser.add_argument(
            "--yes",
            action="store_true",
            default=False,
            help="Automatically confirm deletion without prompting.",
        )
        parser.add_argument(
            "--makemigrations",
            action="store_true",
            default=False,
            help="Automatically run makemigrations after deletion without prompting.",
        )

    def _get_app_config(self, app_name):
        """
        Resolve an app config from either a dotted path (e.g. 'src.notifications')
        or a plain app label (e.g. 'notifications').
        """
        try:
            return apps.get_app_config(app_name)
        except LookupError:
            pass

        for app_config in apps.get_app_configs():
            if app_config.name == app_name:
                return app_config

        label = app_name.rsplit(".", 1)[-1]
        try:
            return apps.get_app_config(label)
        except LookupError:
            raise CommandError(
                f"App '{app_name}' not found in INSTALLED_APPS. "
                f"Tried label '{app_name}' and '{label}'."
            )

    def _get_app_labels(self, app_names):
        """
        Convert dotted app names to their Django app labels
        for use with call_command('makemigrations', ...).
        """
        labels = []
        for app_name in app_names:
            app_config = self._get_app_config(app_name)
            labels.append(app_config.label)
        return labels

    def handle(self, *args, **options):
        apps_to_clean = options["apps"] or getattr(settings, "MY_APPS", [])
        if not apps_to_clean:
            raise CommandError(
                "No apps specified and settings.MY_APPS is empty. "
                "Provide app names or set MY_APPS in settings."
            )

        auto_confirm = options["yes"]
        auto_makemigrations = options["makemigrations"]

        # Step 1: collect migration files grouped by app
        files_by_app = {}

        for app_name in apps_to_clean:
            app_config = self._get_app_config(app_name)
            migrations_dir = Path(app_config.path) / "migrations"

            if not migrations_dir.exists():
                self.stdout.write(f"  No migrations folder found for app '{app_name}'")
                continue

            migration_files = [
                f
                for f in sorted(migrations_dir.iterdir())
                if f.is_file() and f.name != "__init__.py" and f.suffix == ".py"
            ]

            if migration_files:
                files_by_app[app_name] = migration_files

        if not files_by_app:
            self.stdout.write("No migration files found to delete.")
            return

        # Step 2: preview files to be deleted
        total = sum(len(files) for files in files_by_app.values())
        self.stdout.write("")
        self.stdout.write(f"  Found {total} migration file(s) across {len(files_by_app)} app(s):")
        self.stdout.write("")

        for app_name, files in files_by_app.items():
            self.stdout.write(self.style.WARNING(f"  📦 {app_name}"))
            for f in files:
                self.stdout.write(self.style.WARNING(f"     ⚠️  {f.name}"))
            self.stdout.write("")

        # Step 3: confirmation
        if not auto_confirm:
            app_list = ", ".join(self.style.WARNING(a) for a in files_by_app)
            self.stdout.write(f"  Apps affected: {app_list}")
            self.stdout.write("")
            confirm = input("  Are you sure you want to delete these files? [y/N]: ")
            if confirm.strip().lower() != "y":
                self.stdout.write("\n  Aborted.")
                return
            self.stdout.write("")

        # Step 4: delete files
        for app_name, files in files_by_app.items():
            for f in files:
                os.remove(f)
                self.stdout.write(self.style.ERROR(f"  ❌ Deleted: {f}"))

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"  ✅ Successfully deleted {total} migration file(s)."))
        self.stdout.write("")

        # Step 5: optionally run makemigrations
        run_makemigrations = auto_makemigrations

        if not run_makemigrations and not auto_confirm:
            confirm = input("  Would you like to run makemigrations now? [y/N]: ")
            run_makemigrations = confirm.strip().lower() == "y"
            self.stdout.write("")

        if run_makemigrations:
            app_labels = self._get_app_labels(files_by_app.keys())
            app_list = ", ".join(self.style.WARNING(label) for label in app_labels)
            self.stdout.write(f"  🔄 Running makemigrations for: {app_list}")
            self.stdout.write("")

            try:
                call_command("makemigrations", *app_labels, stdout=self.stdout, stderr=self.stderr)
            except Exception as e:
                self.stdout.write("")
                self.stdout.write(self.style.ERROR(f"  ❌ makemigrations failed: {e}"))
                return

            self.stdout.write("")
            self.stdout.write(self.style.SUCCESS("  ✅ makemigrations completed successfully."))
            self.stdout.write("")