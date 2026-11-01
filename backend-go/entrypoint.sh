#!/bin/sh
set -eu

# 绑定宿主机目录会覆盖镜像内的权限，因此先修复上传目录，
# 再降权到应用用户运行后端。
mkdir -p /app/data/uploads
chown -R app:app /app/data
exec su-exec app:app /app/touqi-api
