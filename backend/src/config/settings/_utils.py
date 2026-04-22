import os
import sys
import dotenv


def _log(msg, level="INFO"):
    """Print to stderr since Python logging isn't configured yet during settings init."""
    print(f"[{level}] load_env_vars: {msg}", file=sys.stderr)


def load_env_vars(env_file: str = "./.env", always_create_env: bool=False):
    _log(f"called with env_file={env_file!r}, always_create_env={always_create_env!r}")
    if not os.path.isfile(env_file):
        env_path = os.path.abspath(env_file)
        env_file = os.path.join(env_path, ".env")
        _log(f"⚠️ ENV path was not a file. Assuming {env_file} as the ENV file path.", "WARNING")
    if not os.path.exists(env_file):
        if always_create_env:
            _log(
                f"⚠️ ENV file {env_file} does not exist. Creating an empty .env file at {env_file}.",
                "WARNING",
            )
            with open(env_file, "w"):
                pass
        else:
            _log(
                f"⚠️ ENV file {env_file} does not exist. Skipping loading environment variables.",
                "WARNING",
            )
            return
    getattr(
        dotenv,
        "read_dotenv",
        getattr(
            dotenv,
            "load_dotenv",
            lambda *args: print(
                "⚠️ DOT ENV NOT LOADED. The dotenv module is not installed",
                file=sys.stderr,
            ),
        ),
    )(env_file)
    _log(f"✅ Environment variables loaded from {env_file}.")

class env:
    @staticmethod
    def parse_env_list(raw_list_string, skip_these: list=('*', "'self'")):
        r = raw_list_string.split(",")
        k = []
        for i in r:
            s = i.strip()
            if s and s not in skip_these:
                k.append(s)
        return k
    
