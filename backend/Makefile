-include makefiles/fail2ban.mk
-include makefiles/vps.mk

include .env
export

PY=3.14
PROJECT_NAME=bedflow

.DEFAULT_GOAL := run


clean:
	rm -f uv.lock


init:
	uv python pin $(PY)
	uv lock


setup: init


install:
	uv sync --frozen --active


install+: setup install


uninstall:
	@echo "Use 'uv remove <package>' to uninstall individual packages."


runserver:
	uv run python manage.py runserver 9000


run: runserver

r: run

shell:
	uv run python manage.py shell

shell+:
	uv run python manage.py shell_plus

showurls:
	uv run python manage.py show_urls


# # Detailed table (default)
# python extract_links.py schema.yaml

# # Just the paths
# python extract_links.py schema.yaml -f simple

# # Grouped by tag
# python extract_links.py schema.yaml -f grouped

# # Filter by HTTP method
# python extract_links.py schema.yaml --method POST

# # Filter by tag
# python extract_links.py schema.yaml --tag auth

# # Count endpoints
# python extract_links.py schema.yaml --count

# # Combine filters
# python extract_links.py schema.yaml --method GET --tag organizations -f grouped

links:
	uv run python scripts/extract_swagger_links.py scripts/api.yaml -f simple

links+:
	uv run python scripts/extract_swagger_links.py scripts/api.yaml


migrations:
	uv run python manage.py makemigrations


migrations-bro:
	uv run python manage.py makemigrations common files notifications users


superuser:
	uv run python manage.py createsuperuser


migrate:
	uv run python manage.py migrate

new-app:
	uv run python scripts/create_django_app.py


delete-migration-files:
	uv run python manage.py delete_migration_files

delete-migrations: delete-migration-files

delete-all-tables:
	uv run python manage.py delete_all_tables

drop-tables: delete-all-tables

# reset tables (doesn't delete tables)
flush:
	uv run python manage.py flush  

collectstatic:
	uv run python manage.py collectstatic


collectstatic_force:
	uv run python manage.py collectstatic --noinput --clear


gg:
	gunicorn src.wsgi:application --bind 0.0.0.0:8000

g:
	gunicorn src.wsgi:application --bind 0.0.0.0:9000

render-start-command:
	gunicorn src.wsgi:application --bind 0.0.0.0:$PORT

uvicorn:
	uv run python -m uvicorn src.asgi:application --host 0.0.0.0 --port 9000

daphne:
	uv run python -m daphne -b 0.0.0.0 -p 9000 src.asgi:application

daphne+:
	uv run python -m watchfiles --filter python "uv run python -m daphne -b 0.0.0.0 -p 9000 src.asgi:application"

redis:
	@echo "Starting Redis..."
	sudo service redis-server start

check-redis:
	@echo "Checking Redis..."
	sudo service redis-server status

check-redis+:
	@echo "Checking Redis port..."
	uv run python scripts/check_redis_port.py

stop-redis:
	@echo "Stopping Redis..."
	sudo service redis-server stop

websocket:
	@echo "Running Websocket Test..."
	websocat ws://127.0.0.1:7000/api/v1/ws/



# ----------------------------------------------------------------------------------

diff-staged:
	git diff --cached > ./a.diff
	code ./a.diff
	rm ./a.diff

diff+: diff-staged


diff-unstaged:
	git diff > ./a.diff
	code ./a.diff
	rm ./a.diff

diff: diff-unstaged



# ----------------------------------------------------------------------------------

randomkeys:
	uv run python scripts/generate_random_keys.py .env DJANGO_SECRET_KEY JWT_SIGNING_KEY

randomkeys-prod:
	uv run python scripts/generate_random_keys.py .env.prod DJANGO_SECRET_KEY JWT_SIGNING_KEY

# ----------------------------------------------------------------------------------
# THESE ARE ALL LOADED FROM .ENV

# DOMAIN ?= api.zeefas.com
# EMAIL ?= williamusanga23@gmail.com
# COMPOSE_FILE ?= docker-compose.yaml

# # Container names
# CERTBOT_CONTAINER ?= certbot
# NGINX_CONTAINER ?= nginx
# POSTGRES_CONTAINER ?= postgres
# REDIS_CONTAINER ?= redis
# DJANGO_APP_CONTAINER ?= django_app

# # NETWORK
# NETWORK_NAME ?= zeefas_app_network
# POSTGRES_VOLUME_NAME ?= zeefas_postgres_data
# STATIC_VOLUME_NAME ?= zeefas_static_volume
# MEDIA_VOLUME_NAME ?= zeefas_media_volume

.PHONY: up certs restart https down help setup-cert 


up:
	@echo "Starting initial run with HTTP only..."
	docker compose -f $(COMPOSE_FILE) up -d

certs: up
	@echo "Waiting for Nginx to be ready..."
	uv run python scripts/wait_for_nginx.py
	@echo "Generating Let's Encrypt certificates for $(DOMAIN)..."
	docker compose -f $(COMPOSE_FILE) run --rm $(CERTBOT_CONTAINER) certonly --webroot --webroot-path=/var/www/certbot \
		--email "$(DOCKER_EMAIL)" --agree-tos --no-eff-email --force-renewal -d $(DOMAIN)
	@echo "Certificate generation complete."

restart:
	@echo "Regenerating Nginx config with HTTPS..."
	docker compose -f $(COMPOSE_FILE) exec $(NGINX_CONTAINER) /bin/bash /start-nginx.sh
	@echo "Restarting Nginx..."
	docker compose -f $(COMPOSE_FILE) restart $(NGINX_CONTAINER)

https: up certs restart
	@echo "HTTPS setup complete! Access via https://$(DOMAIN)"

down:
	@echo "Stopping all services..."
	docker compose -f $(COMPOSE_FILE) down

setup-cert:
	@echo "Generating Let's Encrypt certificates for $(DOMAIN)..."
	docker run --rm --name temp_certbot --network $(NETWORK_NAME) \
		-v ./certbot/conf:/etc/letsencrypt \
		-v ./certbot/www:/var/www/certbot \
		certbot/certbot certonly --webroot -w /var/www/certbot \
		--email $(DOCKER_EMAIL) --agree-tos --no-eff-email -d $(DOMAIN)
	@echo "Certificate generation complete."

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@echo "  up      Start services (HTTP only)."
	@echo "  certs   Generate/renew certificates (requires 'up')."
	@echo "  restart Reload Nginx with HTTPS (requires 'certs')."
	@echo "  https   Full HTTPS setup (up -> certs -> restart)."
	@echo "  down    Stop and remove services."
	@echo "  help    Show this help."

rebuild:
	@echo "Rebuilding everything..."
	docker compose -f docker-compose.yaml up -d --build

rebuild-app:
	@echo "Rebuilding Django app container..."
	docker compose -f docker-compose.yaml up -d --build ${DJANGO_APP_CONTAINER}


collectstatic+:
	docker compose exec ${DJANGO_APP_CONTAINER} python manage.py collectstatic --noinput

manual-collectstatic:
	docker run --rm \
		-v $$(pwd)/src/static:/source \
		-v static_volume:/dest \
		alpine sh -c "cp -r /source/* /dest/"


list-containers:
	docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

list-volumes:
	docker volume ls --format "table {{.Name}}\t{{.Driver}}"

list-networks:
	docker network ls --format "table {{.Name}}\t{{.Driver}}"

list-images:
	docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.Size}}"

health-check:
	docker inspect --format='{{.Name}}: {{.State.Health.Status}}' $(docker ps -q)

dockerness:
	@echo "====== CONTAINERS ======="
	@docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
	@echo ""
	@echo "====== VOLUMES =========="
	@docker volume ls --format "table {{.Name}}\t{{.Driver}}"
	@echo ""
	@echo "====== NETWORKS ========="
	@docker network ls --format "table {{.Name}}\t{{.Driver}}"
	@echo ""
	@echo "====== IMAGES ==========="
	@docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.Size}}"
	@echo ""
	@echo "====== HEALTH CHECK ====="
	@containers=$$(docker ps -q); \
	if [ -n "$$containers" ]; then \
		docker inspect --format='{{.Name}}: {{.State.Health.Status}}' $$containers; \
	else \
		echo "No running containers"; \
	fi


	
lazydocker:
	docker run --rm -it -v /var/run/docker.sock:/var/run/docker.sock -v /your/config:/.config/jesseduffield/lazydocker lazyteam/lazydocker
