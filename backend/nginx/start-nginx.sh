#!/bin/bash
set -e

# Replace environment variables in template
envsubst '$$DOMAIN' < /etc/nginx/conf.d/app.conf.template > /etc/nginx/conf.d/app.conf

# Check if certificates exist
if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    echo "✅ SSL certificates found for ${DOMAIN}, enabling HTTPS"
    # Properly uncomment the entire HTTPS server block
    sed -i '/^# server {/,/^# }/s/^# \?//' /etc/nginx/conf.d/app.conf
        
    # Enable redirection from HTTP to HTTPS
    sed -i 's/# return 301/return 301/' /etc/nginx/conf.d/app.conf
    
else
    echo "❌ No SSL certificates found for ${DOMAIN}, using HTTP only"
    # Leave the HTTPS server block commented out
    # The HTTP server will handle all requests
fi

# Start Nginx
echo "Starting Nginx..."
nginx -t  # Test the configuration
exec nginx -g 'daemon off;'