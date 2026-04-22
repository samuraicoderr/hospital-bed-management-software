# Summary of project Structure
This is a summary of the project structure

## The 'src' folder

contains project apps, and configuration
```
- src
    - config: main config folder

    # apps
    - users:        Handles user 
    - common:       helpers and constants across project
    - files:        handles upload and download of files
    - notification: handles sending emails
    - social:       handles login with social media, basicaly oauth

    # other files
    - __init__.py
    - urls.py
    - wsgi.py
```

## Dependency management

Dependencies are managed with uv using `pyproject.toml` and `uv.lock`.

installation
```bash
uv sync --frozen
```