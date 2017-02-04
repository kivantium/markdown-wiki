# markdown-doc
A markdown-based Wiki for mathematics

Running at https://kivantium.net/

## Features
- Online editing by GitHub flavored markdown
- Fast math typesetting by KaTeX

## Install
```
git clone https://github.com/kivantium/markdown-wiki.git
cd markdown-wiki
sudo npm install
forever start index.js
```

It will run at http://localhost:3000/

## nginx configuration example
You can redirect the access to the port 80 to this wiki.

configuration example (`/etc/nginx/conf.d/default.conf`)
```
server {
    listen 80;
    server_name localhost;
    return 301 https://$host$request_uri;
}
server {
    listen       443 ssl;
    server_name  localhost;
    
    ssl_certificate /etc/letsencrypt/live/your.domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your.domain/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
