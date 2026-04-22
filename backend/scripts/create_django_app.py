#!/usr/bin/env python3
"""
Django Sub-App Creator

Creates a new Django app and moves it to the src/ directory.
Performs validation checks before creating the app.

Usage:
    python create_app.py
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path


def print_error(message: str) -> None:
    """Print error message in red."""
    print(f"\033[91m❌ ERROR: {message}\033[0m", file=sys.stderr)


def print_success(message: str) -> None:
    """Print success message in green."""
    print(f"\033[92m✅ {message}\033[0m")


def print_info(message: str) -> None:
    """Print info message in blue."""
    print(f"\033[94mℹ️  {message}\033[0m")


def validate_app_name(app_name: str) -> bool:
    """
    Validate Django app name according to Django conventions.
    
    Returns True if valid, False otherwise.
    """
    if not app_name:
        print_error("App name cannot be empty.")
        return False
    
    if not app_name.isidentifier():
        print_error(
            f"'{app_name}' is not a valid Python identifier. "
            "Use only letters, numbers, and underscores. Must start with a letter or underscore."
        )
        return False
    
    if app_name.startswith("_"):
        print_error("App name should not start with an underscore.")
        return False
    
    # Check for Python reserved keywords
    import keyword
    if keyword.iskeyword(app_name):
        print_error(f"'{app_name}' is a Python reserved keyword.")
        return False
    
    # Check for common Django/Python module conflicts
    conflicting_names = {
        "test", "tests", "django", "models", "views", "admin", 
        "urls", "forms", "migrations", "settings", "config"
    }
    if app_name in conflicting_names:
        print_error(
            f"'{app_name}' conflicts with common Django/Python modules. "
            "Please choose a different name."
        )
        return False
    
    return True


def check_directory_exists(path: Path, location: str) -> bool:
    """
    Check if directory exists at the given path.
    
    Returns True if exists (error condition), False if safe to proceed.
    """
    if path.exists() and path.is_dir():
        print_error(
            f"Directory '{path.name}' already exists in {location}: {path.absolute()}"
        )
        return True
    return False


def get_project_root() -> Path:
    """
    Find the Django project root by looking for manage.py.
    
    Returns the project root Path or raises SystemExit if not found.
    """
    current = Path.cwd()
    
    # Check current directory first
    if (current / "manage.py").exists():
        return current
    
    # Check parent directories (up to 3 levels)
    for _ in range(3):
        current = current.parent
        if (current / "manage.py").exists():
            return current
    
    print_error(
        "Could not find Django project root (manage.py not found). "
        "Please run this script from within your Django project."
    )
    sys.exit(1)


def create_django_app(app_name: str, project_root: Path) -> bool:
    """
    Create Django app using django-admin startapp command.
    
    Returns True if successful, False otherwise.
    """
    print_info(f"Creating Django app '{app_name}'...")
    
    try:
        # Run django-admin startapp
        result = subprocess.run(
            [sys.executable, "manage.py", "startapp", app_name],
            cwd=project_root,
            capture_output=True,
            text=True,
            check=True,
        )
        
        if result.returncode == 0:
            print_success(f"Django app '{app_name}' created successfully.")
            return True
        else:
            print_error(f"Failed to create app. Output: {result.stderr}")
            return False
            
    except subprocess.CalledProcessError as e:
        print_error(f"Failed to create Django app: {e.stderr}")
        return False
    except Exception as e:
        print_error(f"Unexpected error while creating app: {e}")
        return False


def move_app_to_src(app_name: str, project_root: Path) -> bool:
    """
    Move the created app directory to src/.
    
    Returns True if successful, False otherwise.
    """
    source_path = project_root / app_name
    src_dir = project_root / "src"
    destination_path = src_dir / app_name
    
    # Ensure src directory exists
    if not src_dir.exists():
        print_info(f"Creating src/ directory at {src_dir}")
        try:
            src_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            print_error(f"Failed to create src/ directory: {e}")
            return False
    
    print_info(f"Moving '{app_name}' to src/...")
    
    try:
        shutil.move(str(source_path), str(destination_path))
        print_success(f"App moved to {destination_path}")
        return True
    except Exception as e:
        print_error(f"Failed to move app to src/: {e}")
        return False


def update_apps_config(app_name: str, destination_path: Path) -> None:
    """Update the apps.py to reflect the new location in src/."""
    apps_py = destination_path / "apps.py"
    
    if not apps_py.exists():
        print_error(f"apps.py not found at {apps_py}")
        return
    
    try:
        with open(apps_py, "r") as f:
            content = f.read()
        
        # Update the name field to include 'src.' prefix
        updated_content = content.replace(
            f"name = '{app_name}'",
            f"name = 'src.{app_name}'"
        )
        
        with open(apps_py, "w") as f:
            f.write(updated_content)
        
        print_success(f"Updated apps.py with correct module path: src.{app_name}")
        
    except Exception as e:
        print_error(f"Failed to update apps.py: {e}")


def print_next_steps(app_name: str) -> None:
    """Print instructions for next steps."""
    print("\n" + "=" * 60)
    print_success("App created successfully!")
    print("=" * 60)
    print("\n📝 Next steps:\n")
    print(f"1. Add 'src.{app_name}' to INSTALLED_APPS in your settings:")
    print(f"   \033[93mINSTALLED_APPS = [")
    print(f"       ...,")
    print(f"       'src.{app_name}',")
    print(f"   ]\033[0m\n")
    print(f"2. Create your models in src/{app_name}/models.py")
    print(f"3. Run migrations:")
    print(f"   \033[93mpython manage.py makemigrations {app_name}\033[0m")
    print(f"   \033[93mpython manage.py migrate\033[0m\n")
    print(f"4. Start building your app in \033[94msrc/{app_name}/\033[0m")
    print("=" * 60)


def main() -> None:
    """Main execution function."""
    print("\n" + "=" * 60)
    print("🚀 Django Sub-App Creator")
    print("=" * 60 + "\n")
    
    # Get app name from user
    app_name = input("Enter the name for your new Django app: ").strip().lower()
    
    # Validate app name
    if not validate_app_name(app_name):
        sys.exit(1)
    
    # Find project root
    try:
        project_root = get_project_root()
        print_info(f"Project root: {project_root}")
    except SystemExit:
        raise
    
    # Check if app already exists in current directory
    current_dir_path = project_root / app_name
    if check_directory_exists(current_dir_path, "project root"):
        sys.exit(1)
    
    # Check if app already exists in src/
    src_path = project_root / "src" / app_name
    if check_directory_exists(src_path, "src/"):
        sys.exit(1)
    
    # Create the Django app
    if not create_django_app(app_name, project_root):
        sys.exit(1)
    
    # Move app to src/
    if not move_app_to_src(app_name, project_root):
        # Cleanup: remove the created app if move fails
        print_info("Cleaning up created app directory...")
        try:
            shutil.rmtree(current_dir_path)
        except Exception as e:
            print_error(f"Failed to cleanup: {e}")
        sys.exit(1)
    
    # Update apps.py configuration
    update_apps_config(app_name, src_path)
    
    # Print next steps
    print_next_steps(app_name)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Operation cancelled by user.")
        sys.exit(130)
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)