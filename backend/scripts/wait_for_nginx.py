import urllib.request
import urllib.error
import subprocess
import time
import os
from datetime import datetime, timedelta

ENV_PATH = '../.env'

def load_env():
    """Load environment variables from .env file"""
    try:
        with open(ENV_PATH) as f:
            for line in f:
                if line.strip() and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value
    except FileNotFoundError as ex:
        print("❌ .env file not found", ex)


load_env()
NGINX_CONTAINER = os.getenv("NGINX_CONTAINER", "nginx")

def is_nginx_ready(timeout=10):
    """Check if Nginx is ready using only stdlib"""
    start = datetime.now()
    deadline = start + timedelta(seconds=timeout)

    while datetime.now() < deadline:
        # 1. Check container state
        try:
            proc = subprocess.run(
                ["docker", "inspect", "--format={{.State.Running}}", NGINX_CONTAINER],
                capture_output=True,
                text=True,
                check=True
            )
            if proc.stdout.strip() != "true":
                print("❌ Container not running")
                time.sleep(2)
                continue
        except subprocess.CalledProcessError:
            print("❌ Container check failed")
            time.sleep(2)
            continue

        # 2. Check HTTP response
        try:
            print('🙏 Testing http://localhost')
            with urllib.request.urlopen("http://localhost", timeout=2) as response:
                if response.getcode() == 200:
                    print("✅ Nginx ready")
                    return True
        except (urllib.error.URLError, ConnectionError) as e:
            print(f"Waiting... ({str(e)})")
            time.sleep(3)

    print(f"😞 Timeout after {timeout}s")
    return False

if __name__ == "__main__":
    exit(0 if is_nginx_ready() else 1)