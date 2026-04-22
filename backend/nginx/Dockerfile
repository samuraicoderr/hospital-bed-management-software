# nginx/Dockerfile
FROM nginx:latest

# Remove the default config
RUN rm /etc/nginx/conf.d/default.conf

# Just an optional echo to verify in logs
RUN echo "✅ Custom Nginx image with default.conf removed"

# Let CMD be defined by docker-compose
