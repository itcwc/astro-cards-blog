---
title: Nginx 反向代理与 HTTPS 配置要点
date: 2026-08-11
description: 自托管静态站时最容易踩的几个 Nginx 配置坑：root 指向、SPA 回退、缓存头与证书自动续期。
category: 运维
series: 建站手记
draft: false
---

静态站托管在自建服务器上时，Nginx 只需要很少几行配置，但这几行里有几个坑值得记下来。

## root 要指向构建产物

如果你用 CI 构建，站点根目录应该指向仓库下的 `dist/`，而不是仓库根：

```nginx
root /www/wwwroot/your-site/dist;
index index.html;
```

## 静态资源加缓存指纹

Astro 构建出的文件名自带 hash，所以资源可以长期缓存，HTML 则不缓存：

```nginx
location ~* \.(js|css|png|jpg|svg|woff2)$ {
  expires 30d;
  add_header Cache-Control "public, immutable";
}
location = /index.html { add_header Cache-Control "no-store"; }
```

## 证书自动续期

用 acme.sh 申请证书后，别用 crontab 里那种「每月 1 号」的写法，让它自己判断续期时机：

```bash
acme.sh --install-cert -d example.com \
  --key-file /etc/nginx/ssl/example.com.key \
  --fullchain-file /etc/nginx/ssl/example.com.crt \
  --reloadcmd "nginx -s reload"
```

## 一个容易忽略的点

改完配置先 `nginx -t` 再 reload。reload 失败不会让站点立刻挂掉，但会让你的改动看起来"没生效"，排查起来很浪费时间。
