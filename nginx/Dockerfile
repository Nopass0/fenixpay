FROM nginx:alpine

# Install openssl for certificate verification (alpine already has it)
RUN apk add --no-cache openssl

# Copy configuration files
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Override the default entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]