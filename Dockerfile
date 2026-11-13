FROM php:8.3-apache

# Schakel Apache mod_rewrite in (voor /inloggen/bevestig en /rsvp) en installeer optioneel MySQL/MariaDB PDO
RUN a2enmod rewrite \
    && docker-php-ext-install pdo_mysql

WORKDIR /var/www/html

COPY . /var/www/html/

RUN mkdir -p /var/www/html/data \
    && chown -R www-data:www-data /var/www/html/data \
    && chmod 775 /var/www/html/data

EXPOSE 80
